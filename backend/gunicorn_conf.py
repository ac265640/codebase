# gunicorn_conf.py
workers = 2
threads = 4
timeout = 300  # 5 minutes timeout (default is 90s, too short for embeddings)
