#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/admin/(tabs)/index.tsx', 'r') as f:
    content = f.read()

# Define the old string to replace
old_str = """  statusValue: {
    color: '#94A3B8',
    fontSize: 12,
  },
});"""

# Define the new string
new_str = """  statusValue: {
    color: '#94A3B8',
    fontSize: 12,
  },
  // New styles for integrated sections
  metricSubtext: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  userDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  userRevenue: {
    alignItems: 'flex-end',
  },
  userRevenueText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRevenueLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  gymsList: {
    gap: 12,
  },
  gymCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gymHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gymIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  gymStats: {
    flexDirection: 'row',
    gap: 16,
  },
  gymStat: {
    flex: 1,
    alignItems: 'center',
  },
  gymStatNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gymStatLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  tokensList: {
    gap: 8,
  },
  tokenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenCode: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenType: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  tokenStatus: {
    alignItems: 'flex-end',
  },
  tokenStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginBottom: 2,
  },
  tokenStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  tokenTime: {
    color: '#94A3B8',
    fontSize: 11,
  },
});"""

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    print("Replacement found and performed!")
    
    # Write the new content back to the file
    with open('/app/frontend/app/admin/(tabs)/index.tsx', 'w') as f:
        f.write(new_content)
    print("File updated successfully!")
else:
    print("Old string not found in file!")
    print("Looking for pattern...")
    # Let's check what's actually at the end of the file
    lines = content.split('\n')
    for i, line in enumerate(lines[-10:], len(lines)-10):
        print(f"{i}: {repr(line)}")