import logging
import sys
import os

import requests
import yaml
from . import session_state

logger = logging.getLogger(__name__)

username = sys.stdin.read()
if username == "":
    logger.error("Please enter a valid username.")
    exit()


telegramPath = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "accounts", username, "telegram.yml"
)


class SendTelegramEndSession:
    def run(self, username):
        def telegram_bot_sendtext(text):
            with open(telegramPath, "r", encoding="utf-8") as stream:
                try:
                    config = yaml.safe_load(stream)
                    bot_api_token = config.get("telegram-api-token")
                    bot_chat_ID = config.get("telegram-chat-id")
                except yaml.YAMLError as e:
                    logger.error(e)
            if bot_api_token is not None and bot_chat_ID is not None:
                method = "sendMessage"
                parse_mode = "markdown"
                params = {
                    "text": text,
                    "chat_id": bot_chat_ID,
                    "parse_mode": parse_mode,
                }
                url = f"https://api.telegram.org/bot{bot_api_token}/{method}"
                response = requests.get(url, params=params)
                return response.json()

        if username is None:
            logger.error("You have to specify an username for getting reports!")
            return None
        statString = f"## {username} stopped."
        try:
            r = telegram_bot_sendtext(statString)
            if r.get("ok"):
                return logger.info(
                    "Sent message to telegram.",
                )
            else:
                return logger.error("Unable to send telegram report")

        except Exception as e:
            return logger.error(f"Telegram message failed to send. Error: {e}")


sendTelegram = SendTelegramEndSession()
sendTelegram.run(username)
