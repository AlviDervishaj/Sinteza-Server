import json
import csv
import os

import pandas as pd


def logger(x):
    return print(x, flush=True)


def write_headers(headers):
    with open("accounts/scraped_sessions.txt", "w+") as _f:
        # write headers
        for header in headers:
            _f.write(f"{header}, ")


def check_usernames_in_scraped_sessions():
    if not os.path.isfile("accounts/scraped_sessions.json"):
        return None
    with open("accounts/scraped_sessions.json", "r") as _f:
        _data = json.load(_f)
        return _data.keys()


def write_values(values):
    with open("accounts/scraped_sessions.txt", "a+") as _f:
        lines = _f.readlines()
        for value in values:
            _f.write("\n")
            for val in value:
                _f.write(f"{val}, ")


accounts_path = "accounts"

# get usernames
usernames = []
# get folder names under accounts folder
for folder in os.listdir(accounts_path):
    # check if folder is a folder
    if os.path.isdir(os.path.join(accounts_path, folder)):
        usernames.append(folder)

_previous_usernames = check_usernames_in_scraped_sessions()
if _previous_usernames == None:
    logger("No previous usernames found.")
else:
    logger(f"{len(_previous_usernames)} previous usernames found.")
    [
        usernames.append(username)
        for username in _previous_usernames
        if username not in usernames
    ]

# get data
data = {}
for username in usernames:
    if os.path.isfile(os.path.join(accounts_path, username, "sessions.json")):
        logger("Scraping " + username)
        with open(os.path.join(accounts_path, username, "sessions.json")) as json_data:
            data[username] = json.load(json_data)
    else:
        logger("No sessions.json found for " + username)

# store into a file
with open(os.path.join(accounts_path, "scraped_sessions.json"), "w+") as f:
    json.dump(data, f, indent=2)


logger("Scraped files stored in accounts/scraped_sessions.json")


logger("Generating reports...")


class GenerateReports:
    def run(self, username, followers_now, following_now, sessionPath):
        self.followers_now = followers_now
        self.following_now = following_now
        self.sessionPath = sessionPath
        self.time_left = None
        self.username = username

        file = os.path.join(self.sessionPath, "sessions.json")

        with open(file) as json_data:
            activity = json.load(json_data)

        aggActivity = []
        for session in activity:
            try:
                start = session["start_time"]
                finish = session["finish_time"]
                followed = session.get("total_followed", 0)
                unfollowed = session.get("total_unfollowed", 0)
                likes = session.get("total_likes", 0)
                watched = session.get("total_watched", 0)
                comments = session.get("total_comments", 0)
                pm_sent = session.get("total_pm", 0)
                followers = int(session.get("profile", 0).get("followers", 0))
                following = int(session.get("profile", 0).get("following", 0))
                aggActivity.append(
                    [
                        start,
                        finish,
                        likes,
                        watched,
                        followed,
                        unfollowed,
                        comments,
                        pm_sent,
                        followers,
                        following,
                    ]
                )
            except TypeError:
                continue

        df = pd.DataFrame(
            aggActivity,
            columns=[
                "start",
                "finish",
                "likes",
                "watched",
                "followed",
                "unfollowed",
                "comments",
                "pm_sent",
                "followers",
                "following",
            ],
        )
        df["date"] = df.loc[:, "start"].str[:10]
        df["duration"] = pd.to_datetime(df["finish"], errors="coerce") - pd.to_datetime(
            df["start"], errors="coerce"
        )
        df["duration"] = df["duration"].dt.total_seconds() / 60

        dailySummary = df.groupby(by="date").agg(
            {
                "likes": "sum",
                "watched": "sum",
                "followed": "sum",
                "unfollowed": "sum",
                "comments": "sum",
                "pm_sent": "sum",
                "followers": "max",
                "following": "max",
                "duration": "sum",
            }
        )
        if len(dailySummary.index) > 1:
            dailySummary["followers_gained"] = dailySummary["followers"].astype(
                int
            ) - dailySummary["followers"].astype(int).shift(1)
        else:
            dailySummary["followers_gained"] = dailySummary["followers"].astype(int)
        dailySummary.dropna(inplace=True)
        dailySummary["followers_gained"] = dailySummary["followers_gained"].astype(int)
        dailySummary["duration"] = dailySummary["duration"].astype(int)

        followers_before = int(df["followers"].iloc[-1])
        following_before = int(df["following"].iloc[-1])
        statString = {
            "Username": self.username,
            "Followers": f"{followers_now} ({followers_now - followers_before:+})",
            "Following": f"{following_now} ({following_now - following_before:+})",
            "Last Session Activity Botting": f'{str(df["duration"].iloc[-1].astype(int))}',
            "Last Session Activity Likes": f"{str(df['likes'].iloc[-1])}",
            "Last Session Activity Follows": f"{str(df['followed'].iloc[-1])}",
            "Last Session Activity Unfollows": f"{str(df['unfollowed'].iloc[-1])} ",
            "Last Session Activity Stories Watched": f"{str(df['watched'].iloc[-1])}",
            "Today Session Activity Botting": f"{str(dailySummary['duration'].iloc[-1])}",
            "Today Session Activity Likes": f"{str(dailySummary['likes'].iloc[-1])}",
            "Today Session Activity Follows": f"{str(dailySummary['followed'].iloc[-1])}",
            "Today Session Activity Unfollows": f"{str(dailySummary['unfollowed'].iloc[-1])}",
            "Today Session Activity Stories Watched": f"{str(dailySummary['watched'].iloc[-1])}",
            "Trends New Followers today": f"{str(dailySummary['followers_gained'].iloc[-1])}",
            "Trends New Followers past 3 days": f"{str(dailySummary['followers_gained'].tail(3).sum())}",
            "Trends New Followers past week": f"{str(dailySummary['followers_gained'].tail(7).sum())}",
            "Weekly Average Followers Per Day": f"{str(round(dailySummary['followers_gained'].tail(7).mean(), 1))}",
            "Weekly Average Likes": f"{str(int(dailySummary['likes'].tail(7).mean()))}",
            "Weekly Average Follows": f"{str(int(dailySummary['followed'].tail(7).mean()))}",
            "Weekly Average Unfollows": f"{str(int(dailySummary['unfollowed'].tail(7).mean()))}",
            "Weekly Average Stories-watched": f"{str(int(dailySummary['watched'].tail(7).mean()))}",
            "Weekly Average Botting": f"{str(int(dailySummary['duration'].tail(7).mean()))}",
            "Start Date": f"{str(df['start'].iloc[0])}",
            "End Date": f"{str(df['start'].iloc[-1])}",
        }
        return statString


if __name__ == "__main__":
    result = []
    for username in data:
        followers_now = data[username][0]["profile"]["followers"]
        following_now = data[username][0]["profile"]["following"]
        sessionPath = os.path.join(accounts_path, username)
        generatedReports = GenerateReports()
        result.append(
            generatedReports.run(
                username=username,
                followers_now=followers_now,
                following_now=following_now,
                sessionPath=sessionPath,
            )
        )
    logger("Reports generated!")
    logger("Reports stored in accounts/generated_data.json")
    with open(os.path.join(accounts_path, "generated_data.json"), "w+") as f:
        json.dump(result, f, indent=4, sort_keys=True)
    # get object keys to use as headers
    headers = []
    values = [data.values() for data in result]
    for key in result:
        keys = key.keys()
        headers.append(keys)
    write_headers(headers[0])
    write_values(values)
    logger("Generated in accounts/scraped_sessions.txt")
