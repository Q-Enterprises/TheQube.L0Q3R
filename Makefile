SHELL := /bin/bash
.ONESHELL:
.SHELLFLAGS := -euo pipefail -c

FIXTURE_ROOT ?= fixtures/vault_anchor_write_v1
NODE_VERIFY_DIR := $(FIXTURE_ROOT)/verify
NODE_VERIFY := $(NODE_VERIFY_DIR)/verify.mjs
PY_VERIFY := $(NODE_VERIFY_DIR)/verify.py

LOG_DIR := $(FIXTURE_ROOT)/logs

.PHONY: verify verify-node verify-py clean-logs check-fixtures

verify: check-fixtures clean-logs verify-node verify-py
	@echo "PASS (node + python) :: $(FIXTURE_ROOT)"

check-fixtures:
	@test -d "$(NODE_VERIFY_DIR)" || (echo "Missing verify dir: $(NODE_VERIFY_DIR)" >&2 && exit 1)
	@test -f "$(NODE_VERIFY)" || (echo "Missing node verifier: $(NODE_VERIFY)" >&2 && exit 1)
	@test -f "$(PY_VERIFY)" || (echo "Missing python verifier: $(PY_VERIFY)" >&2 && exit 1)

verify-node:
	@mkdir -p "$(LOG_DIR)"
	@echo "[node] running verifier..."
	@pushd "$(NODE_VERIFY_DIR)" >/dev/null
	@npm ci > "../logs/node.install.log" 2>&1
	@node "$(NODE_VERIFY)" .. > "../logs/node.out.log" 2> "../logs/node.err.log"
	@popd >/dev/null
	@echo "[node] PASS"

verify-py:
	@mkdir -p "$(LOG_DIR)"
	@echo "[python] running verifier..."
	@python3 -m pip install --disable-pip-version-check -q cryptography > "$(LOG_DIR)/py.install.log" 2>&1
	@python3 "$(PY_VERIFY)" "$(FIXTURE_ROOT)" > "$(LOG_DIR)/py.out.log" 2> "$(LOG_DIR)/py.err.log"
	@echo "[python] PASS"

clean-logs:
	@rm -rf "$(LOG_DIR)"
