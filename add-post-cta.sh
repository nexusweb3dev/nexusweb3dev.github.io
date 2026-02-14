#!/bin/bash
# Add end-of-article CTA to all blog posts

POST_CTA='
        <div class="post-cta">
            <h3>Want This Analysis for Your Token?</h3>
            <p>We apply the same security methodology to your smart contracts. Get a professional audit before launch.</p>
            <a href="/token-security-scan.html">Get Security Scan →</a>
        </div>
'

# Find all blog post HTML files (not index/about/methodology)
find /data/.openclaw/workspace/blog/blog -name "*.html" -type f ! -name "index.html" | while read file; do
    # Check if file already has post-cta
    if ! grep -q 'class="post-cta"' "$file"; then
        # Find last </article> or </main> or <footer> and insert before it
        if grep -q '</article>' "$file"; then
            # Insert before </article>
            sed -i "s|</article>|$POST_CTA\n</article>|" "$file"
            echo "Updated: $file (before </article>)"
        elif grep -q '</main>' "$file"; then
            # Insert before </main>
            sed -i "s|</main>|$POST_CTA\n</main>|" "$file"
            echo "Updated: $file (before </main>)"
        elif grep -q '<footer>' "$file"; then
            # Insert before <footer>
            sed -i "s|<footer>|$POST_CTA\n<footer>|" "$file"
            echo "Updated: $file (before <footer>)"
        else
            echo "Skipped (no insertion point): $file"
        fi
    else
        echo "Skipped (already has CTA): $file"
    fi
done

echo "Done."
