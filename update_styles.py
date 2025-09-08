#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/admin/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# Define the style updates needed
updates = [
    # Update metricSubtext
    {
        'old': '''  metricSubtext: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
  },''',
        'new': '''  metricSubtext: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },'''
    },
    # Update seeAllText color
    {
        'old': '''  seeAllText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '500',
  },''',
        'new': '''  seeAllText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },'''
    },
    # Update userAvatar backgroundColor
    {
        'old': '''  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },''',
        'new': '''  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },'''
    }
]

# Apply updates
updated_content = content
for update in updates:
    if update['old'] in updated_content:
        updated_content = updated_content.replace(update['old'], update['new'])
        print(f"Updated style successfully")
    else:
        print(f"Style not found: {update['old'][:50]}...")

# Write the updated content back to the file
with open('/app/frontend/app/admin/(tabs)/index.tsx', 'w') as f:
    f.write(updated_content)

print("File updated successfully!")