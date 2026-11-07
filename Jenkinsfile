// SalahTime website (FO, frontend/): build and upload to Hostinger over FTP.
//
// - Click "Build with Parameters" -> Build to release.
// - It also runs by itself every night at 00:05 IST: the build prerenders today's prayer times
//   into page titles (CR-006), so this keeps search results current.
//
// Setup: deploy/JENKINS.md. Works on a Windows or Linux Jenkins machine with Node.js 20+ and Git.

def cmd(String command) {
  if (isUnix()) {
    sh command
  } else {
    bat command
  }
}

def requireEnv(String name, String value) {
  if (!value?.trim()) {
    error("Set ${name} in Manage Jenkins -> System -> Global properties -> Environment variables (see deploy/JENKINS.md)")
  }
  return value.trim()
}

pipeline {
  agent any

  parameters {
    string(name: 'BRANCH', defaultValue: 'feature-dev/1.0.54',
      description: 'Git branch to build. The nightly run uses this default, so update it when you move to a new release branch.')
    booleanParam(name: 'DEPLOY', defaultValue: true,
      description: 'Untick to only build (no upload).')
  }

  triggers {
    // 00:05 IST daily: rebuild so prerendered titles carry the new day's prayer times.
    cron('TZ=Asia/Kolkata\n5 0 * * *')
  }

  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timeout(time: 90, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps {
        script {
          def nightly = !currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause').isEmpty()
          currentBuild.description = "${nightly ? 'Nightly refresh' : 'Release'} from ${params.BRANCH}${params.DEPLOY ? '' : ' (build only)'}"
        }
        checkout scmGit(branches: [[name: "*/${params.BRANCH}"]], userRemoteConfigs: [[url: 'https://github.com/fareed543/salahtime.git']])
      }
    }

    stage('Build') {
      steps {
        dir('frontend') {
          cmd('npm ci --no-audit --no-fund')
          // Also generates the sitemaps and prerenders every page (postbuild:prod).
          cmd('npm run build:prod')
        }
      }
    }

    stage('Upload to Hostinger') {
      when { expression { params.DEPLOY } }
      steps {
        cmd('npm ci --prefix deploy --no-audit --no-fund')
        withCredentials([usernamePassword(credentialsId: 'hostinger-ftp-fo', usernameVariable: 'FTP_USER', passwordVariable: 'FTP_PASSWORD')]) {
          withEnv([
            "FTP_HOST=${requireEnv('SALAHTIME_FTP_HOST', env.SALAHTIME_FTP_HOST)}",
            "FTP_REMOTE_DIR=${requireEnv('SALAHTIME_FO_FTP_DIR', env.SALAHTIME_FO_FTP_DIR)}",
            "FTP_SECURE=${env.SALAHTIME_FTP_SECURE ?: 'true'}",
            // Zip of the live site taken before every upload; only the newest 2 FO backups are kept.
            "FTP_BACKUP_DIR=${env.SALAHTIME_FO_BACKUP_DIR ?: '/Backup'}",
            "FTP_BACKUP_KEEP=${env.SALAHTIME_FO_BACKUP_KEEP ?: '2'}"
          ]) {
            // Backs up the live site, then sends only files that changed since the last upload (deploy/ftp-deploy.js).
            cmd('node deploy/ftp-deploy.js frontend/dist/salahtime')
          }
        }
      }
    }
  }

  post {
    success { echo "Done: ${currentBuild.description}" }
    failure { echo "Failed: ${currentBuild.description}. The live site keeps its previous files for anything not uploaded." }
  }
}
