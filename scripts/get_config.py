import os
import yaml
import sys
import json

username = sys.stdin.read()
def logger(x): return print(x, flush=True)


if (username.strip() == "" or not username):
    logger("Please enter a valid username.")
    exit()


iBot_path = os.path.join(os.path.dirname(
    os.path.dirname(__file__)), 'accounts', username)


with open(os.path.join(iBot_path, 'config.yml'), 'r', encoding='utf-8') as stream:
    try:
        config = json.dumps(yaml.safe_load(stream))
    except yaml.YAMLError as e:
        logger.error(e)

    logger(config)
