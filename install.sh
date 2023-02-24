#!/bin/bash
# Script to be executed just once, when the system is installed.
cd /app/entities-lib
npm install
cd /app/config-lib
npm install
cd /app/UsersService
npm install
npm start 
