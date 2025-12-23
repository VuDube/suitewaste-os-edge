#!/bin/bash
# SuiteWaste OS :: Cloudflare Environment Setup Script
# This script automates the provisioning of necessary Cloudflare resources.
# It is designed to be idempotent (safe to run multiple times).
set -e # Exit immediately if a command exits with a non-zero status.
# --- Configuration ---
# You can change these names if needed, but they should match your wrangler config.
PROJECT_NAME="suitewaste-os"
D1_DB_NAME="suitewaste_os_db"
KV_NAMESPACE_NAME="PRICING_CONFIG"
R2_BUCKET_NAME="suitewaste-os-attachments"
SCHEMA_FILE="sql/init_schema.sql"
# --- Helper Functions ---
function check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ Error: '$1' command not found. Please install it and ensure it's in your PATH."
        if [ "$1" == "wrangler" ]; then
            echo "   Install Wrangler with: npm install -g wrangler"
        fi
        exit 1
    fi
}
function print_header() {
    echo ""
    echo "===================================================================="
    echo "  ���� $1"
    echo "===================================================================="
}
# --- Main Execution ---
# 1. Check for dependencies
print_header "Checking for dependencies..."
check_command "wrangler"
echo "✅ Wrangler CLI is installed."
# 2. D1 Database Setup
print_header "Setting up D1 Database: '$D1_DB_NAME'"
if wrangler d1 info "$D1_DB_NAME" &> /dev/null; then
    echo "✅ D1 database '$D1_DB_NAME' already exists. Skipping creation."
else
    echo "▶️  Creating D1 database '$D1_DB_NAME'..."
    wrangler d1 create "$D1_DB_NAME"
    echo "✅ D1 database created successfully."
fi
# 3. Apply SQL Schema
print_header "Applying SQL schema from '$SCHEMA_FILE'"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Error: Schema file not found at '$SCHEMA_FILE'."
    exit 1
fi
echo "▶️  Executing schema on '$D1_DB_NAME'..."
wrangler d1 execute "$D1_DB_NAME" --file="$SCHEMA_FILE"
echo "✅ SQL schema applied successfully."
# 4. KV Namespace Setup
print_header "Setting up KV Namespace: '$KV_NAMESPACE_NAME'"
if wrangler kv:namespace list | grep -q "$KV_NAMESPACE_NAME"; then
    echo "✅ KV namespace '$KV_NAMESPACE_NAME' already exists. Skipping creation."
else
    echo "▶️  Creating KV namespace '$KV_NAMESPACE_NAME'..."
    wrangler kv:namespace create "$KV_NAMESPACE_NAME"
    echo "✅ KV namespace created successfully."
fi
# 5. R2 Bucket Setup
print_header "Setting up R2 Bucket: '$R2_BUCKET_NAME'"
if wrangler r2 bucket list | grep -q "$R2_BUCKET_NAME"; then
    echo "✅ R2 bucket '$R2_BUCKET_NAME' already exists. Skipping creation."
else
    echo "▶️  Creating R2 bucket '$R2_BUCKET_NAME'..."
    wrangler r2 bucket create "$R2_BUCKET_NAME"
    echo "✅ R2 bucket created successfully."
fi
# 6. Final Instructions
print_header "Setup Complete! Please take the following manual step:"
echo "Your Cloudflare resources have been provisioned."
echo "Due to project constraints, you must manually add the bindings to your 'wrangler.jsonc' or 'wrangler.toml' file."
echo ""
echo "📋 Copy and paste the following bindings into your wrangler configuration file:"
echo ""
echo '```jsonc'
echo '// Add these bindings to your wrangler.jsonc'
echo '"d1_databases": ['
echo '  {'
echo '    "binding": "DB", // This is the name you will use in your worker code'
echo '    "database_name": "'"$D1_DB_NAME"'",'
echo '    "database_id": "<run `wrangler d1 info '"$D1_DB_NAME"'` to get this>"'
echo '  }'
echo '],'
echo '"kv_namespaces": ['
echo '  {'
echo '    "binding": "'"$KV_NAMESPACE_NAME"'",'
echo '    "id": "<run `wrangler kv:namespace list` to get this>"'
echo '  }'
echo '],'
echo '"r2_buckets": ['
echo '  {'
echo '    "binding": "ATTACHMENTS_BUCKET",'
echo '    "bucket_name": "'"$R2_BUCKET_NAME"'"'
echo '  }'
echo ']'
echo '```'
echo ""
echo "Note: You will need to run the provided wrangler commands to get the 'database_id' and KV 'id'."
echo ""
echo "✨ Environment setup is finished."