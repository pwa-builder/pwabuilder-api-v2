#!/bin/bash
  
# turn on bash's job control
set -m
  
# Start the primary process and put it in the background
/azure-functions-host/Microsoft.Azure.WebJobs.Script.WebHost &
  
# Start the helper process
node /home/site/wwwroot/.openAPI/swagger-node-middleware.js
  
# the my_helper_process might need to know how to wait on the
# primary process to start before it does its work and returns
  
  
# now we bring the primary process back into the foreground
# and leave it there
fg %1
