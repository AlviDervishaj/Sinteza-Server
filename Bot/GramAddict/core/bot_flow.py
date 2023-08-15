import logging
import random
from datetime import datetime, timedelta
from time import sleep

from colorama import Fore, Style

from GramAddict.core.config import Config
from GramAddict.core.decorators import retry
from GramAddict.core.device_facade import DeviceFacade, create_device, get_device_info
from GramAddict.core.filter import Filter
from GramAddict.core.filter import load_config as load_filter
from GramAddict.core.interaction import load_config as load_interaction
import GramAddict.core.write_custom_logs as write_custom_logs
from GramAddict.core.log import (
    configure_logger,
    is_log_file_updated,
    update_log_file_name,
)
from GramAddict.core.navigation import check_if_english
from GramAddict.core.persistent_list import PersistentList
from GramAddict.core.report import print_full_report
from GramAddict.core.session_state import SessionState, SessionStateEncoder
from GramAddict.core.storage import Storage
import GramAddict.core.write_custom_logs as write_custom_logs
from GramAddict.core.utils import (
    ask_for_a_donation,
    can_repeat,
    check_adb_connection,
    check_if_updated,
    check_screen_timeout,
    close_instagram,
    config_examples,
    countdown,
    get_instagram_version,
    get_value,
    head_up_notifications,
    kill_atx_agent,
)
from GramAddict.core.utils import load_config as load_utils
from GramAddict.core.utils import (
    move_usernames_to_accounts,
    open_instagram,
    pre_post_script,
    save_crash,
    set_time_delta,
    show_ending_conditions,
    stop_bot,
    wait_for_next_session,
)
from GramAddict.core.views import AccountView, ProfileView, TabBarView, UniversalActions
from GramAddict.core.views import load_config as load_views
from GramAddict.version import TESTED_IG_VERSION


def start_bot(**kwargs):
    # Logging initialization
    logger = logging.getLogger(__name__)

    # Pre-Load Config
    configs = Config(first_run=True, **kwargs)
    username = configs.username
    write_custom_logs.init(username)

    write_custom_logs.override()
    configure_logger(configs.debug, configs.username)
    if not kwargs:
        if "--config" not in configs.args:
            logger.info(
                "It's strongly recommend to use a config.yml file. Follow these links for more details: https://docs.gramaddict.org/#/configuration and https://github.com/GramAddict/bot/tree/master/config-examples",
                extra={"color": f"{Fore.GREEN}{Style.BRIGHT}"},
            )
            sleep(3)

    # Config-example hint
    config_examples()

    # Check for updates
    check_if_updated()

    # Move username folders to a main directory -> accounts
    if "--move-folders-in-accounts" in configs.args:
        move_usernames_to_accounts()

    # Global Variables
    sessions = PersistentList("sessions", SessionStateEncoder)

    # Load Config
    configs.load_plugins()
    configs.parse_args()
    # Some plugins need config values without being passed
    # through. Because we do a weird config/argparse hybrid,
    # we need to load the configs in a weird way
    load_filter(configs)
    load_interaction(configs)
    load_utils(configs)
    load_views(configs)

    if not configs.args or not check_adb_connection():
        return

    if len(configs.actions_enabled) < 1:
        logger.error(
            "You have to specify one of these actions: " + ", ".join(configs.actions)
        )
        write_custom_logs.write(
            "You have to specify one of these actions: " + ", ".join(configs.actions)
        )
        return
    device = create_device(configs.device_id, configs.app_id)
    timeout_startup = get_value(configs.args.timeout_startup, None, 0)
    if timeout_startup:
        countdown(timeout_startup, "Bot starting in {:02d} minutes")
        countdown(random.randint(0, 59), "Bot starting in {:02d} seconds")
    session_state = None
    if str(configs.args.total_sessions) != "-1":
        total_sessions = get_value(configs.args.total_sessions, None, -1)
    else:
        total_sessions = -1

    while True:
        set_time_delta(configs.args)
        inside_working_hours, time_left = SessionState.inside_working_hours(
            configs.args.working_hours, configs.args.time_delta_session
        )
        if not inside_working_hours:
            wait_for_next_session(time_left, session_state, sessions, device)
        pre_post_script(path=configs.args.pre_script)
        get_device_info(device)
        session_state = SessionState(configs)
        session_state.set_limits_session()
        sessions.append(session_state)
        check_screen_timeout()
        device.wake_up()
        head_up_notifications(enabled=False)
        logger.info(
            "-------- START: "
            + str(session_state.startTime.strftime("%H:%M:%S - %Y/%m/%d"))
            + " --------",
            extra={"color": f"{Style.BRIGHT}{Fore.YELLOW}"},
        )
        if not device.get_info()["screenOn"]:
            device.press_power()
        if device.is_screen_locked():
            device.unlock()
            if device.is_screen_locked():
                logger.error(
                    "Can't unlock your screen. There may be a passcode on it. If you would like your screen to be turned on and unlocked automatically, please remove the passcode."
                )
                write_custom_logs.write(
                    "Can't unlock your screen. There may be a passcode on it. If you would like your screen to be turned on and unlocked automatically, please remove the passcode."
                )
                stop_bot(device, sessions, session_state, was_sleeping=False)

        logger.info("Device screen ON and unlocked.")
        for plugin in configs.special_enabled:
            configs.special[plugin].run(device)
        check_ig_version(logger)
        if pre_load(logger, configs, device) is None:
            logger.error(
                "Something is keeping closing IG APP. Please check your logcat to understand the reason! `adb logcat`"
            )
            write_custom_logs.write(
                "Something is keeping closing IG APP. Please check your logcat to understand the reason! `adb logcat`"
            )
            stop_bot(device, sessions, session_state, was_sleeping=False)
        profile_view = ProfileView(device)
        account_view = AccountView(device)
        tab_bar_view = TabBarView(device)
        (
            username,
            session_state.my_posts_count,
            session_state.my_followers_count,
            session_state.my_following_count,
        ) = profile_view.getProfileInfo()
        if (
            username is None
            or session_state.my_posts_count is None
            or session_state.my_followers_count is None
            or session_state.my_following_count is None
        ):
            logger.critical(
                "Could not get one of the following from your profile: username, # of posts, # of followers, # of followings. This is typically due to a soft-ban. Review the crash screenshot to see if this is the case."
            )
            logger.critical(
                f"Username: {username}, Posts: {session_state.my_posts_count}, Followers: {session_state.my_followers_count}, Following: {session_state.my_following_count}"
            )
            save_crash(device)
            stop_bot(device, sessions, session_state)

        if not is_log_file_updated():
            try:
                update_log_file_name(username)
            except Exception as e:
                logger.error(
                    f"Failed to update log file name. Will continue anyway. {e}"
                )
        day = datetime.now().strftime("%d")
        month = datetime.now().strftime("%m")
        hour = datetime.now().strftime("%H")
        minute = datetime.now().strftime("%M")
        write_custom_logs.write(f"____{day}/{month}-{hour}:{minute}____")
        report_string = f"Hello, @{username}! You have {session_state.my_followers_count} followers and {session_state.my_following_count} followings so far."

        write_custom_logs.write(report_string)

        logger.info(report_string, extra={"color": f"{Style.BRIGHT}{Fore.GREEN}"})
        if configs.args.repeat:
            logger.info(
                f"You have {total_sessions + 1 - len(sessions) if total_sessions > 0 else 'infinite'} session(s) left. You can stop the bot by pressing CTRL+C in console.\n",
                extra={"color": f"{Style.BRIGHT}{Fore.BLUE}"},
            )
            sleep(3)
        if configs.args.shuffle_jobs:
            jobs_list = random.sample(
                configs.actions_enabled, len(configs.actions_enabled)
            )
        else:
            jobs_list = configs.actions_enabled

        print_limits = True
        unfollow_jobs = [x for x in jobs_list if "unfollow" in x]
        logger.info(
            f"There is/are {len(jobs_list)-len(unfollow_jobs)} active-job(s) and {len(unfollow_jobs)} unfollow-job(s) scheduled for this session."
        )
        storage = Storage(username)
        filters = Filter(storage)
        show_ending_conditions()
        if not configs.debug:
            countdown(10, "Bot will start in: {:02d}")
        for plugin in jobs_list:
            inside_working_hours, time_left = SessionState.inside_working_hours(
                configs.args.working_hours, configs.args.time_delta_session
            )
            if not inside_working_hours:
                logger.info(
                    "Outside of working hours. Ending session.",
                    extra={"color": f"{Fore.CYAN}"},
                )
                break
            (
                active_limits_reached,
                unfollow_limit_reached,
                actions_limit_reached,
            ) = session_state.check_limit(
                limit_type=session_state.Limit.ALL, output=print_limits
            )
            if actions_limit_reached:
                logger.info(
                    "At last one of these limits has been reached: interactions/successful or scraped. Ending session.",
                    extra={"color": f"{Fore.CYAN}"},
                )
                break
            if profile_view.getUsername() != username:
                logger.debug("Not in your main profile.")
                tab_bar_view.navigate_to_profile()
            if plugin in unfollow_jobs:
                if configs.args.scrape_to_file is not None:
                    logger.warning(
                        "Scraping in unfollow-jobs doesn't make any sense. SKIP. "
                    )
                    continue
                if unfollow_limit_reached:
                    logger.warning(
                        f"Can't perform {plugin} job because the unfollow limit has been reached. SKIP."
                    )
                    print_limits = None
                    continue
                logger.info(
                    f"Current unfollow-job: {plugin}",
                    extra={"color": f"{Style.BRIGHT}{Fore.BLUE}"},
                )
                configs.actions[plugin].run(
                    device, configs, storage, sessions, filters, plugin
                )
                unfollow_jobs.remove(plugin)
                print_limits = True
            else:
                if active_limits_reached:
                    logger.warning(
                        f"Can't perform {plugin} job because a limit for active-jobs has been reached."
                    )
                    print_limits = None
                    if unfollow_jobs:
                        continue
                    else:
                        logger.info(
                            "No other jobs can be done cause of limit reached. Ending session.",
                            extra={"color": f"{Fore.CYAN}"},
                        )
                        break

                logger.info(
                    f"Current active-job: {plugin}\n",
                    extra={"color": f"{Style.BRIGHT}{Fore.BLUE}"},
                )
                write_custom_logs.write(f"Current active-job: {plugin}")
                if configs.args.scrape_to_file is not None:
                    logger.warning(
                        "You're in scraping mode! That means you're only collection data without interacting!"
                    )
                configs.actions[plugin].run(
                    device, configs, storage, sessions, filters, plugin
                )
                print_limits = True

        # save the session in sessions.json
        session_state.finishTime = datetime.now()
        sessions.persist(directory=username)

        # print reports
        logger.info("Going back to your profile..")
        profile_view.click_on_avatar()
        if profile_view.get_following_count() is None:
            profile_view.click_on_avatar()
        account_view.refresh_account()
        (
            _,
            _,
            followers_now,
            following_now,
        ) = profile_view.getProfileInfo()
        parameters = {"followers_now": followers_now, "following_now": following_now}
        for plugin in configs.analytics_enabled:
            configs.analytics[plugin].run(
                configs.config,
                plugin,
                parameters,
            )

        # turn off bot
        close_instagram(device)
        if configs.args.screen_sleep:
            device.screen_off()
            logger.info("Screen turned off for sleeping time.")

        kill_atx_agent(device)
        head_up_notifications(enabled=True)
        logger.info(
            "-------- FINISH: "
            + str(session_state.finishTime.strftime("%H:%M:%S - %Y/%m/%d"))
            + " --------",
            extra={"color": f"{Style.BRIGHT}{Fore.YELLOW}"},
        )
        pre_post_script(pre=False, path=configs.args.post_script)

        if configs.args.repeat and can_repeat(len(sessions), total_sessions):
            print_full_report(sessions, configs.args.scrape_to_file)
            inside_working_hours, time_left = SessionState.inside_working_hours(
                configs.args.working_hours, configs.args.time_delta_session
            )
            if inside_working_hours:
                time_left = (
                    get_value(configs.args.repeat, "Sleep for {} minutes.", 180) * 60
                )
                logger.info(
                    f'Next session will start at: {(datetime.now() + timedelta(seconds=time_left)).strftime("%H:%M:%S (%Y/%m/%d)")}.'
                )
                # open file in logs/{username}
                write_custom_logs.write(f"Sleep for {time_left / 60} minutes.\n")
                write_custom_logs.write(
                    f'Next session will start at: {(datetime.now() + timedelta(seconds=time_left)).strftime("%H:%M:%S (%Y/%m/%d)")}.'
                )
                try:
                    sleep(time_left)
                except KeyboardInterrupt:
                    stop_bot(
                        device,
                        sessions,
                        session_state,
                        was_sleeping=True,
                    )
            else:
                wait_for_next_session(
                    time_left,
                    session_state,
                    sessions,
                    device,
                )
        else:
            break
    print_full_report(sessions, configs.args.scrape_to_file)
    ask_for_a_donation()


@retry(3, (DeviceFacade.AppHasCrashed,))
def pre_load(logger, configs, device):
    """
    Prepare IG app to perform bot actions
    """
    if not open_instagram(device):
        return None
    UniversalActions.close_keyboard(device)
    account_view = AccountView(device)
    success = False
    if configs.args.username is not None:
        if account_view.is_account_selecting():
            success = account_view.log_in_from_account_selecting(configs.args.username)
        if account_view.is_login_requested() and not success:
            account_view.log_in_by_credentials(
                configs.args.username, configs.args.password
            )
        check_if_english(device)
        success = account_view.changeToUsername(
            configs.args.username, configs.args.password
        )
        if not success:
            logger.error(f"Not able to change to {configs.args.username}, abort!")
            save_crash(device)
            device.back()
            return None
    account_view.refresh_account()
    return True


def check_ig_version(logger):
    try:
        running_ig_version = get_instagram_version()
        logger.info(f"Instagram version: {running_ig_version}")
        if tuple(running_ig_version.split(".")) > tuple(TESTED_IG_VERSION.split(".")):
            logger.warning(
                f"You have a newer version of IG then the one tested! (Tested version: {TESTED_IG_VERSION}). If you have problems THIS is probably the reason.",
                extra={"color": f"{Style.BRIGHT}"},
            )
    except Exception as e:
        logger.error(f"Error retrieving the IG version. Exception: {e}")
        write_custom_logs.write("Error retrieving the IG version.")
