# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/node:4-node18-appservice

# docker build -t api-v2 .
# docker run -p 80:80 api-v2

# functions api port
# EXPOSE 7071
# swaggerUI + middleware for api
# EXPOSE 80

FROM mcr.microsoft.com/azure-functions/node:4-node18


RUN  apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    # We install Chrome to get all the OS level dependencies, but Chrome itself
    # is not actually used as it's packaged in the node puppeteer library.
    # Alternatively, we could could include the entire dep list ourselves
    # (https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)
    # but that seems too easy to get out of date.
    # adding a dependency for keytar
    && apt-get install -y google-chrome-stable libsecret-1-dev \
    && rm -rf /var/lib/apt/lists/* \
    && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
    && chmod +x /usr/sbin/wait-for-it.sh

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    ASPNETCORE_URLS=http://*:7071



COPY . /home/site/wwwroot


WORKDIR /home/site/wwwroot
RUN rm -rf node_modules && \
    npm install && \
    npm run build


# RUN ["chmod", "+x", "docker-startup-tasks.bash"]
# CMD /bin/bash docker-startup-tasks.bash