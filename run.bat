REM export JEKYLL_ENV="prod"
REM del /f /q /s _site > NUL
REM rmdir /q /s _site
bundle exec jekyll serve --watch --config _config.yml,_config.local.yml
REM bundle exec jekyll serve --host=0.0.0.0 --port 4001 --watch --config _config.local.yml,_config.yml --incremental
