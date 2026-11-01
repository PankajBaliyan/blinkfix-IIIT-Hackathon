"""Runs inside a throwaway copy of the service, in its own process.

It reads a JSON job on stdin, then:
  1. imports the (possibly patched) service module,
  2. replays the request that crashed against its router,
  3. runs the service's unit tests.
It prints one line starting with RESULT: and nothing else matters. It only uses the standard
library plus FastAPI, and it must never import Blinkfix's own code.
"""
import importlib
import io
import json
import sys
import unittest
import warnings

warnings.filterwarnings("ignore")
sys.dont_write_bytecode = True


def replay(mod, request):
    router = getattr(mod, "router", None)
    if router is None:
        return {"status": "no_router"}
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(router)
    # Re-raise errors from the endpoint, so a crash shows up as an exception and not as a bare 500.
    client = TestClient(app, raise_server_exceptions=True)
    url = request["path"] + (f"?{request['query']}" if request.get("query") else "")
    body = request.get("body")
    try:
        resp = client.request(
            request["method"], url, content=body, headers={"content-type": "application/json"} if body else None
        )
        return {"status": resp.status_code, "exception": None}
    except Exception as e:  # noqa: BLE001 - any crash is the signal we are looking for
        return {"status": 500, "exception": {"type": type(e).__name__, "message": str(e)[:200]}}


def run_tests(root):
    try:
        suite = unittest.TestLoader().discover(f"{root}/tests", top_level_dir=root)
    except Exception as e:  # noqa: BLE001
        return {"run": 0, "failures": 0, "error": f"{type(e).__name__}: {e}"[:200]}
    stream = io.StringIO()
    result = unittest.TextTestRunner(stream=stream, verbosity=0).run(suite)
    problems = result.failures + result.errors
    first = ""
    if problems:
        first = problems[0][1].strip().splitlines()[-1][:200]
    return {"run": result.testsRun, "failures": len(problems), "first_failure": first}


def main():
    job = json.loads(sys.stdin.read())
    root = job["root"]
    sys.path.insert(0, root)
    result = {"imported": False, "import_error": None, "replay": None, "tests": None}

    try:
        mod = importlib.import_module(job["module"])
        result["imported"] = True
    except BaseException as e:  # noqa: BLE001 - a patch can break the import in any way
        result["import_error"] = f"{type(e).__name__}: {e}"[:300]
        print("RESULT:" + json.dumps(result))
        return

    if job.get("request"):
        try:
            result["replay"] = replay(mod, job["request"])
        except Exception as e:  # noqa: BLE001
            result["replay"] = {"status": "error", "error": f"{type(e).__name__}: {e}"[:200]}

    if job.get("run_tests"):
        result["tests"] = run_tests(root)

    print("RESULT:" + json.dumps(result))


if __name__ == "__main__":
    main()
