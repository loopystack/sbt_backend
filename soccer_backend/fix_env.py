import os

# Read the current .env file
with open('.env', 'r') as f:
    content = f.read()

# Replace the SECRET_KEY
content = content.replace(
    'SECRET_KEY=your-super-secret-key-here',
    'SECRET_KEY=JDQ1R_DRfuCHm4vm_6Zg76e_2Ng9gqplKqMHu0Gkmog'
)

# Update FRONTEND_URL to match your current dev server
content = content.replace(
    'FRONTEND_URL=http://localhost:5173',
    'FRONTEND_URL=http://localhost:5174'
)

# Write the updated content back
with open('.env', 'w') as f:
    f.write(content)

print("✅ .env file updated successfully!")
print("✅ SECRET_KEY has been set")
print("✅ FRONTEND_URL updated to match your dev server")
print("\n⚠️  IMPORTANT: You still need to configure email settings for signup verification:")
print("   - Set SMTP_USERNAME to your Gmail address")
print("   - Set SMTP_PASSWORD to your Gmail app password")
print("   - Set SMTP_FROM_EMAIL to your Gmail address")
