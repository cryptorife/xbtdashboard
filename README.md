# XBTDashboard

![alt text](https://raw.githubusercontent.com/cryptorife/xbtdashboard/master/screenshots/screenshot.png)

# Requirements:

You must have docker installed and running:

	- https://www.docker.com/products/docker-desktop 

# Download it

https://github.com/cryptorife/xbtdashboard/archive/v1.0.zip

and unzip it


# Run your stack for the first time:

You must run this commands on the terminal

	- Open terminal by going to Spotlight search -> Terminal

```
cd ~/Downloads/xbtdashboard
docker-compose up -d
./setup.sh
```

You should see an output like this one:
![alt text](https://raw.githubusercontent.com/cryptorife/xbtdashboard/master/screenshots/output-screenshot.png)

Problems? Try again.

Go to localhost:3000 on your browser or just type:
```
open localhost:3000
```

Use credentials admin/admin to log in.

You should see something like this:
![alt text](https://raw.githubusercontent.com/cryptorife/xbtdashboard/master/screenshots/init-screenshot.png)

# Run your stack again:
No need to run setup

```
docker-compose up -d
```

# Debug? Show me the logs:

```
docker-compose logs
```

# Stop it:

```
docker-compose stop
docker-compose rm
```

Enjoy