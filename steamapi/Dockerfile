FROM python:latest

RUN pip install --upgrade pip
WORKDIR /usr/src/app/steamapi

COPY steamapi .
COPY entrypoint.sh .
RUN chmod 755 -R . && pip install -r requirements.txt

ENTRYPOINT [ "entrypoint.sh" ]