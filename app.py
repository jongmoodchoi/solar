"""Solar System Simulation – Flask web server."""

import os

from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    """3D solar system simulation."""
    return render_template("index.html")


@app.route("/history")
def history():
    """History of solar system understanding."""
    return render_template("history.html")


@app.route("/math")
def math():
    """Mathematical and computational details."""
    return render_template("math.html")


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug)
