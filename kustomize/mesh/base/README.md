# mesh

## camel-k-operator

This is needed because the helm chart doesn't expose WATCH_NAMESPACE. Instead we use kustomise to pull down the helm chart and patch it.

Argocd in recent versions removed support for --enable-helm so it doesn't download the chart before patching it. For that reason i've temporarily inflated it here.

`https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/`