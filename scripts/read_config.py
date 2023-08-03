import sys
import logging
import os
import yaml

username = sys.stdin.read()
logger = logging.getLogger(__name__)

if username == "":
    print("Please enter a valid username.")
    exit()

telegramPath = os.path.join(os.path.dirname(
    os.path.dirname(__file__)), 'accounts', username, 'config.yml')

with open(telegramPath, 'r', encoding='utf-8') as configFile:
    try:
        config = yaml.safe_load(configFile)
        print(config)
    except yaml.YAMLError as e:
        logger.error(e)
