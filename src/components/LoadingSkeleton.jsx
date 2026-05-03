import React from 'react'

export function TeamCardSkeleton() {
  return (
    <div className="cyber-card p-5 space-y-4">
      <div className="flex justify-between">
        <div className="cyber-skeleton h-5 w-32 rounded-none" />
        <div className="cyber-skeleton h-5 w-16 rounded-none" />
      </div>
      <div className="cyber-skeleton h-4 w-48 rounded-none" />
      <div className="cyber-skeleton h-3 w-36 rounded-none" />
      <div className="flex gap-2 pt-2">
        <div className="cyber-skeleton h-8 w-24 rounded-none" />
        <div className="cyber-skeleton h-8 w-28 rounded-none" />
      </div>
    </div>
  )
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-cyber-cyan/10">
          <div className="cyber-skeleton h-6 w-8 rounded-none" />
          <div className="cyber-skeleton h-5 w-36 rounded-none" />
          <div className="cyber-skeleton h-4 w-48 rounded-none flex-1" />
          <div className="cyber-skeleton h-5 w-16 rounded-none" />
          <div className="cyber-skeleton h-5 w-16 rounded-none" />
          <div className="cyber-skeleton h-6 w-20 rounded-none" />
        </div>
      ))}
    </div>
  )
}

export function TeamDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="cyber-skeleton h-8 w-64 rounded-none" />
      <div className="cyber-skeleton h-4 w-96 rounded-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="cyber-card p-4 space-y-3">
            <div className="cyber-skeleton h-4 w-32 rounded-none" />
            <div className="cyber-skeleton h-6 w-16 rounded-none" />
            <div className="cyber-skeleton h-2 w-full rounded-none" />
            <div className="cyber-skeleton h-3 w-full rounded-none" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoadingSkeleton({ type = 'card', count = 3 }) {
  if (type === 'leaderboard') return <LeaderboardSkeleton />
  if (type === 'detail') return <TeamDetailSkeleton />
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => <TeamCardSkeleton key={i} />)}
    </div>
  )
}
