#!/usr/bin/env bash


cd ./SmartContract

docker build --no-cache -t anchor_smart -f dockerfile .
docker tag anchor_smart:latest mabdockerid/anchor_smart:latest
docker push mabdockerid/anchor_smart:latest

cd ..
cd ./ApiAdaptor

docker build --no-cache -t apiadapter -f dockerfile .
docker tag apiadapter:latest mabdockerid/apiadapter:latest
docker push mabdockerid/apiadapter:latest

