# Craftdot

Get pretty diagram for your architecture/services with an easy way.

## Features

- nest group
- custom attributes with list or key/vaule
- include from file
- custom style
- support wildcards *

## Install

```bash
$ npm install craftdot
```

## Usage

Render crafdot file and open it on browser by default.

```bash
$ craftdot example/example.craftdot
rebuilding...
server listening on http://127.0.0.1:3200
```

## Example
### Comment

```
// this is a comment
```

### Node

#### single node
```
node1
```

<img width="104" alt="image" src="https://user-images.githubusercontent.com/7939352/73840177-8f7be100-4852-11ea-8d64-8e8a1f7ac2db.png">

#### node with attributes

the attributes is compatible with [Graphviz](https://www.graphviz.org/doc/info/attrs.html), so you can use any attribute exist in Graphviz.

```
node1[fillcolor: skyblue, style:filled]
```

<img width="119" alt="image" src="https://user-images.githubusercontent.com/7939352/73840292-cfdb5f00-4852-11ea-889d-a36fe62d66a8.png">

#### node with details

```
list {
    hosts:
        - 172.16.1.4
        - 172.16.1.5
}

key-vaule {
    domain: "https://service.localdomain"
}

both {
    hosts:
        - 172.16.1.10
        - 172.16.1.11
    domain: "https://service.localdomain"
}

with-attributes [fillcolor: skyblue, style:filled]{
    domain: "https://service.localdomain"
}


```


<img width="1192" alt="image" src="https://user-images.githubusercontent.com/7939352/73840886-3dd45600-4854-11ea-8f8a-486729bc343e.png">

#### apply attributes to mutiple nodes with wildcrads *

```
node1
node2
other

node*[fillcolor: skyblue, style:filled]
```

<img width="333" alt="image" src="https://user-images.githubusercontent.com/7939352/73841021-90ae0d80-4854-11ea-86a4-916aef95d260.png">

### group

one group must contain at least one node or one group.

```
group cluster1 {
    node1
    node2
}
```

<img width="261" alt="image" src="https://user-images.githubusercontent.com/7939352/73841329-55f8a500-4855-11ea-9926-39c3c52c4370.png">


#### nest groups

```
group cluster1 {
    node1
    node2
    group sub-cluster1 {
        node1
        node2
    }
}

```

<img width="482" alt="image" src="https://user-images.githubusercontent.com/7939352/73841439-9b1cd700-4855-11ea-969f-73b12d729b4e.png">

### edge

```
node1
node2
node1 -> node2
```

<img width="208" alt="image" src="https://user-images.githubusercontent.com/7939352/73841574-db7c5500-4855-11ea-87ae-d52d7e35713d.png">

#### mutiple edge in one line
```
node1
node2
node3

node1 -> node2,node3
```
<img width="265" alt="image" src="https://user-images.githubusercontent.com/7939352/73841693-11213e00-4856-11ea-88c9-9d89a9deccf6.png">


#### edge with attributes
same as node, the attributes is compatible with [Graphviz](https://www.graphviz.org/doc/info/attrs.html), so you can use any attribute exist in Graphviz.

```
node1
node2

node1 -> node2 [label: "hi", color: "red"]
```

<img width="180" alt="image" src="https://user-images.githubusercontent.com/7939352/73841889-7aa14c80-4856-11ea-8ddf-1f349b034af8.png">

#### apply attributes to mutiple edges with wildcrads *
```
node1
node2
node3
db

node1,node2,node3 -> db
* -> db [color: red]
```
<img width="313" alt="image" src="https://user-images.githubusercontent.com/7939352/73842052-d075f480-4856-11ea-981e-8dd8b1cce49b.png">

### include

```
// node.craftdot
node1
node2
```

```
// edge.craftdot
node1 -> node2
```

```
// include.craftdot
include {"node.craftdot"}
include {"edge.craftdot"}
```

<img width="208" alt="image" src="https://user-images.githubusercontent.com/7939352/73841574-db7c5500-4855-11ea-87ae-d52d7e35713d.png">

