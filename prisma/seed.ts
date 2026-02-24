import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@focusmate.com' },
    update: {},
    create: {
      email: 'admin@focusmate.com',
      name: 'Admin',
      password: adminPassword,
      role: Role.ADMIN,
      profile: {
        create: {
          bio: 'System Administrator',
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: true
          }
        }
      }
    }
  })

  // Create demo user
  const userPassword = await bcrypt.hash('user123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Demo User',
      password: userPassword,
      role: Role.USER,
      profile: {
        create: {
          bio: 'Student learning to focus better',
          preferences: {
            theme: 'light',
            language: 'vi',
            notifications: true
          }
        }
      }
    }
  })

  // Create sample focus sessions for demo user
  const now = new Date()
  
  for (let i = 0; i < 5; i++) {
    const sessionDate = new Date(now)
    sessionDate.setDate(sessionDate.getDate() - i)
    
    const duration = 25 * 60 // 25 minutes in seconds
    const blinkCount = Math.floor(Math.random() * 50) + 20
    const yawnCount = Math.floor(Math.random() * 5)
    const lookAwayCount = Math.floor(Math.random() * 20) + 5
    const distractionTime = Math.floor(Math.random() * 120) + 30
    
    // Calculate focus score
    const blinkRate = blinkCount / 25
    const distractionRatio = distractionTime / duration
    let score = 100
    score -= Math.min(blinkRate * 2, 20)
    score -= Math.min(yawnCount * 5, 15)
    score -= Math.min(lookAwayCount * 3, 15)
    score -= Math.min(distractionRatio * 50, 40)
    score = Math.max(0, Math.min(100, score))

    const session = await prisma.focusSession.create({
      data: {
        userId: user.id,
        startedAt: sessionDate,
        endedAt: new Date(sessionDate.getTime() + duration * 1000),
        duration: 25,
        actualDuration: duration,
        status: 'COMPLETED',
        blinkCount,
        yawnCount,
        lookAwayCount,
        distractionTime,
        focusScore: score,
        recommendations: score < 70 
          ? ['take_break', 'hydrate', 'adjust_lighting']
          : score < 85 
            ? ['maintain_posture', 'stay_hydrated']
            : ['great_job', 'keep_it_up']
      }
    })

    // Create metrics for this session
    const metricsCount = 10
    for (let j = 0; j < metricsCount; j++) {
      const metricTime = new Date(sessionDate.getTime() + (j * duration * 1000 / metricsCount))
      await prisma.focusMetric.create({
        data: {
          sessionId: session.id,
          timestamp: metricTime,
          isBlinking: Math.random() < 0.1,
          isYawning: Math.random() < 0.05,
          isLookingAway: Math.random() < 0.15,
          headRotationX: (Math.random() - 0.5) * 0.3,
          headRotationY: (Math.random() - 0.5) * 0.3,
          headRotationZ: (Math.random() - 0.5) * 0.2,
          focusLevel: Math.floor(Math.random() * 30) + 70
        }
      })
    }
  }

  // Create sample chat messages
  await prisma.chatMessage.createMany({
    data: [
      {
        userId: user.id,
        role: 'user',
        content: 'How can I improve my focus during study sessions?',
        createdAt: new Date(now.getTime() - 86400000)
      },
      {
        userId: user.id,
        role: 'assistant',
        content: 'Here are some tips to improve focus:\n1. Use the Pomodoro Technique (25 min work, 5 min break)\n2. Eliminate distractions - turn off notifications\n3. Create a dedicated study space\n4. Stay hydrated and take regular breaks\n5. Practice mindfulness meditation',
        createdAt: new Date(now.getTime() - 86350000)
      },
      {
        userId: user.id,
        role: 'user',
        content: 'What does my focus score mean?',
        createdAt: new Date(now.getTime() - 43200000)
      },
      {
        userId: user.id,
        role: 'assistant',
        content: 'Your focus score (0-100) is calculated based on:\n- Blink rate (normal: 15-20/min)\n- Yawning frequency\n- Looking away from screen\n- Time spent distracted\n\n90-100: Excellent focus\n70-89: Good focus\n50-69: Moderate - room for improvement\nBelow 50: Needs attention - try adjusting your environment',
        createdAt: new Date(now.getTime() - 43150000)
      }
    ]
  })

  console.log('✅ Seed data created successfully!')
  console.log(`   Admin: admin@focusmate.com / admin123`)
  console.log(`   User:  user@example.com / user123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
