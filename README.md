# craftdot

craftdot is a wapper of graphviz to get pretty diagram for your architecture/services diagrams.


## Install

```bash
$ pip install craftdot
```

> craftdot just output the graphviz code(dot file), you need to render the dot file by yourself. install graphviz on local or use graphviz online tools.


## Useage

you can find example in `example/`, then

```bash
$ craftdot example/multi-groups.yml > example/multi-groups.dot

# render the dot file to pdf
$ dot -Tpdf example/multi-groups.dot -o example/multi-groups.pdf
```
