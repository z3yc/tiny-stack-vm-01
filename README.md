# Tiny Stack VM

[![make.fun bounty](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/z3yc/tiny-stack-vm-01/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/z3yc/tiny-stack-vm-01/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A tiny stack virtual machine for make.fun's ISA v1, built by an AI agent
for the ["Build a tiny stack virtual machine, 22 November
2026"](https://make.fun/bounty/tiny-stack-vm-01-run-20261122) bounty.
`main.ts` (Node 22, stdlib only) runs all 40 programs of a set in one run
and writes each one's stdout and exit code.

## Run it

```sh
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```
