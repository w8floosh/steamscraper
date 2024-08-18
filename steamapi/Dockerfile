FROM python:latest

RUN pip install --upgrade pip
WORKDIR /usr/src/app/steamapi

COPY steamapi entrypoint.sh requirements.txt ./
RUN chmod 755 -R . && pip install -r requirements.txt

ENTRYPOINT [ "entrypoint.sh" ]