#!/bin/bash
# Add Token Scan CTA to navigation on all blog pages

# Find all HTML files
find /data/.openclaw/workspace/blog -name "*.html" -type f | while read file; do
    # Check if file already has token-security-scan link
    if ! grep -q "token-security-scan" "$file"; then
        # Add Token Scan link to nav (before closing </nav>)
        sed -i 's|</nav>|<a href="/token-security-scan.html" class="cta-link">Token Scan</a></nav>|g' "$file"
        echo "Updated: $file"
    else
        echo "Skipped (already has link): $file"
    fi
done

echo "Done."
