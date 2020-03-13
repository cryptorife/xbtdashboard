# Grafana BitMex Dashboard

![alt text](https://raw.githubusercontent.com/cryptorife/xbtdashboard/master/screenshots/screenshot.png)

Requirements:

You must have docker installed and running:
	- https://www.docker.com/products/docker-desktop 

After you have that, you must run this commands on the terminal.
	- Open terminal by going to Spotlight search -> Terminal

Run your stack for the first time:

```
docker-compose up -d
./run.sh
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


Debug? Show me the logs:

```
docker-compose logs
```

Stop it:

```
docker-compose stop
docker-compose rm
```

Enjoy