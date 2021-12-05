## Contents

* [Introduction](#introduction)
* [Installation](#installation)

## Introduction

This is a fork of the repository for [KonText](https://github.com/czcorpus/kontext). For a full description of KonText and it's functionalities, refer to the main repository. This fork is being developed in order to integrate KonText with corpora tagged by [DocuScope](https://www.cmu.edu/dietrich/english/research-and-publications/docuscope.html).


## Installation

Note that the developers of KonText recommend insalling using Docker. However, I have had success installing using LXD. Below, I will include my directions for LXD installation, as well as the original documentation for Docker installation.

Also note that while KonText runs on Python, it is built atop Manatee, which is a component of [No Sketch Engine](https://nlp.fi.muni.cz/trac/noske). Thus, the install script downloads and compiles Manatee, as well as installing a default corpus called **susanne**.

### LXD

A very useful and basic guide to LXD and Linux containters [can be found here](https://ubuntu.com/blog/lxd-2-0-your-first-lxd-container/) and [here](https://linuxcontainers.org/lxd/docs/master/)

[1] Install LXD using Snap:

```shell
snap install lxd
```

[2] Add any necessary non-root accounts to the Unix group. This may be required for users to access needed directories and run commands. You can find [instructions here](https://www.digitalocean.com/community/tutorials/how-to-install-and-configure-lxd-on-ubuntu-20-04).

[3] Configure LXD options. Again, you can follow [these directions](https://www.digitalocean.com/community/tutorials/how-to-install-and-configure-lxd-on-ubuntu-20-04).

```shell
sudo lxd init
```
[4] Create a container called **kontext-container**:

```shell
lxc launch ubuntu:bionic kontext-container
```

[5] Note the container's IP address from the output given by **list**:

```shell
lxc list
```

[6] If the container isn't running, it can be started using:

```shell
lxc start kontext-container
```

[7] Start a shell inside the container:

```shell
lxc shell kontext-container
```
[8] In the container, git-clone the KonText git repo to a directory of your choice (e.g. /opt/kontext), set the required permissions and run the install script.

```shell
sudo apt-get update
sudo apt-get install -y ca-certificates git
git clone https://github.com/browndw/kontext.git /opt/kontext/
python3 /opt/kontext/scripts/install/install.py
```
[9] To start KonText, enter the following command in the KonText install root directory (i.e. /opt/kontext):

```shell
cd /opt/kontext
sudo -u www-data python3 public/app.py --address 127.0.0.1 --port 8080
```
[10] Open a browser and input the IP address you noted at step 5 (e.g., 10.65.23.28). The container can be stopped by exiting from the shell and using:

```shell
lxc stop kontext-container
```


### Docker

Running KonText as a set of Docker containers is the most convenient and flexible way. To run a basic 
configuration instance (i.e. no MySQL/MariaDB server, no WebSocket server) use:

```shell
docker-compose up
```

To run a production grade instance:

```shell
docker-compose -f docker-compose.yml -f docker-compose.mysql.yml --env-file .env.mysql up
```

(the `.env.mysql` allows configuring custom MySQL/MariaDB credentials and KonText configuration file)


### Manual installation

#### Key requirements

* Python *3.6* (or newer)
* [Manatee](http://nlp.fi.muni.cz/trac/noske) corpus search engine - version *2.167.8* and onwards
* a key-value storage
    * [Redis](http://redis.io/) (recommended), [SQLite](https://sqlite.org/) (supported), custom implementations possible
* a task queue - [Rq](https://python-rq.org/) (recommended), [Celery task queue](http://www.celeryproject.org/) (supported)
* HTTP proxy server
  + [Nginx](http://nginx.org/) (recommended), [Apache](http://httpd.apache.org/),...


For Ubuntu OS users, it is recommended to use the [install script](scripts/install/install.py) which should 
perform most of the actions necessary to install and run KonText. For other Linux distributions we recommend
running KonText within a container or a virtual machine. Please refer to the [doc/INSTALL.md](doc/INSTALL.md) 
file for details.


## Customization and contribution

Please refer to our [Wiki](https://github.com/czcorpus/kontext/wiki/Development-and-customization).

## Notable users

* [Institute of the Czech National Corpus](https://kontext.korpus.cz/)
* [LINDAT/CLARIAH-CZ](https://ufal.mff.cuni.cz/lindat-kontext)
* [CLARIN-PL](https://kontext.clarin-pl.eu/)
* [CLARIN-SI](https://www.clarin.si/kontext/)
* [Інститут української](https://mova.institute/kontext/first_form)
* [Serbski Institut](https://www.serbski-institut.de) (API version of KonText)

## How to cite KonText

Tomáš Machálek (2020) - KonText: Advanced and Flexible Corpus Query Interface

```bibtex
@inproceedings{machalek-2020-kontext,
    title = "{K}on{T}ext: Advanced and Flexible Corpus Query Interface",
    author = "Mach{\'a}lek, Tom{\'a}{\v{s}}",
    booktitle = "Proceedings of the 12th Language Resources and Evaluation Conference",
    month = may,
    year = "2020",
    address = "Marseille, France",
    publisher = "European Language Resources Association",
    url = "https://www.aclweb.org/anthology/2020.lrec-1.865",
    pages = "7003--7008",
    language = "English",
    ISBN = "979-10-95546-34-4",
}
```
