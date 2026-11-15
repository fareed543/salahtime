// SalahTime website (FO, frontend/): build and upload to Hostinger over FTP.
//
// - Click "Build with Parameters" -> Build to release by hand.
// - The nightly 00:05 IST refresh and the release on every merge into develop/<version> now run on
//   GitHub Actions (.github/workflows/website-release.yml, CR-022), so they don't need this
//   computer to be on. This job has no schedule. Don't start it around 00:05 IST: two uploads at
//   once would clash.
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
      description: 'Git branch to build.')
    booleanParam(name: 'DEPLOY', defaultValue: true,
      description: 'Untick to only build (no upload).')
    // prerendered/ is ~4,500 of ~4,650 files and Hostinger drops FTP every few hundred, so a run with it
    // takes ~30-45 min. Untick for a quick release of the app files only.
    booleanParam(name: 'UPLOAD_PRERENDERED', defaultValue: true,
      description: 'Also back up and upload prerendered/ (SEO pages for crawlers, with today\'s prayer times). Slow: ~4,500 files.')
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
          currentBuild.description = "Release from ${params.BRANCH}${params.DEPLOY ? '' : ' (build only)'}"
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
            "FTP_BACKUP_KEEP=${env.SALAHTIME_FO_BACKUP_KEEP ?: '2'}",
            "FTP_SKIP_DIRS=${params.UPLOAD_PRERENDERED ? '' : 'prerendered'}"
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
