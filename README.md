# craftdot

craftdot is a wapper of graphviz to get pretty diagram for your architecture/services diagrams.


## Install

```bash
$ npm install craftdot
```

## Usage

There is an example for craftbot file:
```craftdot
service1

group AWS {
    service2 {
        hosts:
            - 172.16.1.4
            - 172.16.1.5
    }

    builder

    group db {
        mysql-old-cluster {
            version: 5.6
            owner: "dba team"
        }

        mysql-new-cluster {
            version: 5.7
            owner: "dba team"
        }

        redis {
            version: 4
            buckets:
                - example1
                - example2
        }
    }
}

group GCE {
    service3 {
        hosts:
            - 172.16.1.4
            - 172.16.1.5
    }
    registry[fillcolor: skyblue, style:filled]

}

mysql-* [fillcolor: cornflowerblue, style:filled]

service1 -> service2
service1 -> service3
registry -> builder
service2 -> mysql-new-cluster
service3 -> mysql-old-cluster
service2 -> redis
service3 -> redis
builder -> service2
builder -> service3

* -> mysql* [color: red]
```

```bash
$ craftdot example.craftdot > example.dot
$ dot -Tpdf example.dot -o example.pdf
```

You will get this:

![image](https://user-images.githubusercontent.com/7939352/57830642-4b890d80-77e5-11e9-98cc-b03ef0aea58b.png)
