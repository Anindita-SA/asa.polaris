import subprocess
cmd = [
    'git', 'filter-branch', '--force', '--index-filter',
    'git rm -r --cached --ignore-unmatch \"dev guides\"',
    '--prune-empty', '--tag-name-filter', 'cat', '--', '--all'
]
print('Running...')
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print('ERR:', res.stderr)
