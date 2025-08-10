#!/bin/bash
set -e

# Configure vercel project to call this script in a custom Ignored Build Step
# Exit 0, tell vercel to skip build and deploy if only cdn/ changed
if git diff --quiet HEAD^ HEAD -- . ':!cdn/'; then
  exit 0
else
  exit 1
fi
