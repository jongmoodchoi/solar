"""Solar System Simulation – Flask web server."""

import os

from flask import Flask, render_template

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    root_path=APP_ROOT,
    template_folder="templates",
    static_folder="static",
)


@app.context_processor
def inject_static_version():
    override = os.environ.get("STATIC_VERSION")
    if override:
        return {"static_version": override}

    def mtime(rel_path: str) -> int:
        try:
            p = os.path.join(app.root_path, rel_path)
            return int(os.path.getmtime(p))
        except OSError:
            return 0

    # Bump whenever key static assets change.
    v = max(
        mtime(os.path.join("static", "css", "style.css")),
        mtime(os.path.join("static", "js", "simulation.js")),
    )
    return {"static_version": str(v)}


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
