import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="craftdot",
    version="0.0.1",
    author="Kaleo Cheng",
    entry_points={"console_scripts": ['craftdot = craftdot.cli:main']},
    author_email="kaleocheng@gmail.com",
    description="easily to make pretty graphviz diagram",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/kaleocheng/craftdot",
    install_requires=['Click==7.0', 'Jinja2==2.10.1', 'PyYAML==5.1'],
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
