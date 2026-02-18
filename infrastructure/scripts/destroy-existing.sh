#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../terraform"

echo "========================================"
echo " AurumShield — Terraform Destroy Plan"
echo "========================================"
echo ""
echo "This will generate a destroy plan for all AurumShield infrastructure."
echo "Target directory: ${TF_DIR}"
echo ""

if [ ! -f "${TF_DIR}/terraform.tfstate" ]; then
  echo "No terraform.tfstate found in ${TF_DIR}. Nothing to destroy."
  exit 0
fi

echo "Generating destroy plan..."
terraform -chdir="${TF_DIR}" plan -destroy -out=destroy.tfplan

echo ""
echo "========================================"
echo " REVIEW THE PLAN ABOVE CAREFULLY"
echo "========================================"
echo ""
read -r -p "Type 'DESTROY' to execute the destroy plan: " CONFIRM

if [ "${CONFIRM}" = "DESTROY" ]; then
  echo "Executing destroy..."
  terraform -chdir="${TF_DIR}" apply destroy.tfplan
  echo ""
  echo "Destroy complete."
else
  echo "Aborted. No resources were destroyed."
  rm -f "${TF_DIR}/destroy.tfplan"
fi
