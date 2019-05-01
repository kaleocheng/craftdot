#!/usr/bin/env python3
import click
from craftdot import render


@click.command()
@click.argument('source')
def main(source):
    output = render.from_file(source)
    print(output)


if __name__ == '__main__':
    main()
