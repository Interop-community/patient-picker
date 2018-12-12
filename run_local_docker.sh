#!/usr/bin/env bash
docker build -t patient-picker/node-web-app .
docker run -p 8094:8094 patient-picker/node-web-app