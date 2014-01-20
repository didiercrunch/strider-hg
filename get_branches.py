from mercurial import ui, hg, node
from sys import argv

peer = hg.peer(ui.ui(), {}, argv[1])
for name, rev in peer.branchmap().items():
    print(name)