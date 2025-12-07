#!/bin/bash
# Quick script to view the latest analysis logs

kubectl logs -n image-factory-kargo $(kubectl get pods -n image-factory-kargo --sort-by=.metadata.creationTimestamp -o name | tail -1)
