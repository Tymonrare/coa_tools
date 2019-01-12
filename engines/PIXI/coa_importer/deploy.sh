#!/bin/bash

npm start
npm version patch
npm publish
git commit -am 'version update' && git push
