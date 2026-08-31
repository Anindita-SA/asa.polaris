export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch --force --index-filter 'git rm -r --cached --ignore-unmatch "dev guides"' --prune-empty --tag-name-filter cat -- --all
