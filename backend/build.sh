#!/usr/bin/env bash
# Render runs this once on every deploy, before starting the server.
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate
