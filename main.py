#!/usr/bin/env python3
#!/usr/bin/env python3

import yaml
import os
from jinja2 import Template
from pathlib import Path


def read_file(filepath):
    exists = os.path.isfile(filepath)
    if exists == False:
        return None
    with open(filepath, 'r') as f:
        return f.read()


def parse_yaml(content):
    return yaml.safe_load(content)


template = Template(read_file('template.j2'))
result = template.render(clusters=parse_yaml(read_file('example.yaml')))

print(result)
