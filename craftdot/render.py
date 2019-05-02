#!/usr/bin/env python3

import yaml
import os
from jinja2 import Template


def _read_file(filepath):
    exists = os.path.isfile(filepath)
    if exists == False:
        return None
    with open(filepath, 'r') as f:
        return f.read()


def _parse_yaml(content):
    return yaml.safe_load(content)


def _get_template(filepath):
    return Template(_read_file(filepath))


def from_file(source):
    templatefile = os.path.join(os.path.dirname(__file__), 'template.j2')
    template = _get_template(templatefile)
    return template.render(clusters=_parse_yaml(_read_file(source)))
