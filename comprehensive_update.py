#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/admin/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# Define all the style updates needed to match the requested specifications
updates = [
    # Update userCard to include border properties and change background opacity
    {
        'old': '''  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },''',
        'new': '''  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },'''
    },
    # Update planBadge borderRadius
    {
        'old': '''  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },''',
        'new': '''  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },'''
    },
    # Update userDate color
    {
        'old': '''  userDate: {
    color: '#64748B',
    fontSize: 10,
  },''',
        'new': '''  userDate: {
    color: '#94A3B8',
    fontSize: 12,
  },'''
    },
    # Update userRevenueLabel color
    {
        'old': '''  userRevenueLabel: {
    color: '#64748B',
    fontSize: 10,
  },''',
        'new': '''  userRevenueLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },'''
    },
    # Update gymCard to include border properties and change background opacity
    {
        'old': '''  gymCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },''',
        'new': '''  gymCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },'''
    },
    # Update statusBadge borderRadius
    {
        'old': '''  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },''',
        'new': '''  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },'''
    },
    # Update gymStats to include gap
    {
        'old': '''  gymStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },''',
        'new': '''  gymStats: {
    flexDirection: 'row',
    gap: 16,
  },'''
    },
    # Update gymStat to include flex and alignItems
    {
        'old': '''  gymStat: {
    alignItems: 'center',
  },''',
        'new': '''  gymStat: {
    flex: 1,
    alignItems: 'center',
  },'''
    },
    # Update gymStatLabel to include marginTop
    {
        'old': '''  gymStatLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },''',
        'new': '''  gymStatLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },'''
    },
    # Update tokenCard to include border properties and change background opacity
    {
        'old': '''  tokenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },''',
        'new': '''  tokenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },'''
    },
    # Update tokenIcon backgroundColor
    {
        'old': '''  tokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },''',
        'new': '''  tokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },'''
    },
    # Update tokenType to include marginTop
    {
        'old': '''  tokenType: {
    color: '#94A3B8',
    fontSize: 12,
  },''',
        'new': '''  tokenType: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },'''
    },
    # Update tokenStatusBadge borderRadius and padding
    {
        'old': '''  tokenStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },''',
        'new': '''  tokenStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginBottom: 2,
  },'''
    },
    # Update tokenTime fontSize
    {
        'old': '''  tokenTime: {
    color: '#64748B',
    fontSize: 10,
  },''',
        'new': '''  tokenTime: {
    color: '#94A3B8',
    fontSize: 11,
  },'''
    }
]

# Apply updates
updated_content = content
updates_applied = 0

for i, update in enumerate(updates):
    if update['old'] in updated_content:
        updated_content = updated_content.replace(update['old'], update['new'])
        updates_applied += 1
        print(f"Update {i+1}: Applied successfully")
    else:
        print(f"Update {i+1}: Style not found or already updated")

print(f"\nTotal updates applied: {updates_applied}/{len(updates)}")

# Write the updated content back to the file
with open('/app/frontend/app/admin/(tabs)/index.tsx', 'w') as f:
    f.write(updated_content)

print("File updated successfully!")