/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.20-13.0.2-MariaDB, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: nuestro_espacio
-- ------------------------------------------------------
-- Server version	13.0.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `auth_throttles`
--

DROP TABLE IF EXISTS `auth_throttles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_throttles` (
  `key` varchar(100) NOT NULL,
  `count` int(11) NOT NULL,
  `expiresAt` double NOT NULL,
  PRIMARY KEY (`key`),
  KEY `ix_throttle_expiry` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_throttles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `auth_throttles` WRITE;
/*!40000 ALTER TABLE `auth_throttles` DISABLE KEYS */;
INSERT INTO `auth_throttles` VALUES
('login:12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0',1,1791447762065);
/*!40000 ALTER TABLE `auth_throttles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `calendar_events`
--

DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_events` (
  `id` varchar(36) NOT NULL,
  `ownerId` varchar(36) NOT NULL,
  `title` varchar(120) NOT NULL,
  `notes` text NOT NULL,
  `location` varchar(200) NOT NULL,
  `startsAt` double NOT NULL,
  `endsAt` double NOT NULL,
  `recurrence` varchar(12) NOT NULL DEFAULT 'none',
  `recurrenceUntil` double DEFAULT NULL,
  `alertMinutes` int(11) DEFAULT NULL,
  `email` tinyint(1) NOT NULL DEFAULT 0,
  `nextAlertAt` double DEFAULT NULL,
  `alertOccurrenceAt` double DEFAULT NULL,
  `createdAt` double NOT NULL,
  `updatedAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_event_owner_start` (`ownerId`,`startsAt`),
  KEY `ix_event_next_alert` (`nextAlertAt`),
  CONSTRAINT `FK_bbec7b87030771f168cf6625d57` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendar_events`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `calendar_events` WRITE;
/*!40000 ALTER TABLE `calendar_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `calendar_events` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `counter_changes`
--

DROP TABLE IF EXISTS `counter_changes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `counter_changes` (
  `id` varchar(36) NOT NULL,
  `counterId` varchar(36) NOT NULL,
  `actorId` varchar(36) NOT NULL,
  `delta` int(11) NOT NULL,
  `valueAfter` int(11) NOT NULL,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_aebc083965e95b66a6a7dd1673f` (`actorId`),
  KEY `ix_change_counter_time` (`counterId`,`createdAt`),
  CONSTRAINT `FK_aebc083965e95b66a6a7dd1673f` FOREIGN KEY (`actorId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ebf2eb615a1dde31d2f7e3dd820` FOREIGN KEY (`counterId`) REFERENCES `counters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `counter_changes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `counter_changes` WRITE;
/*!40000 ALTER TABLE `counter_changes` DISABLE KEYS */;
INSERT INTO `counter_changes` VALUES
('a2fa6190-a026-44ad-b6c6-e37c90f200e9','3fbf7f64-e443-4a2a-8a98-10f23349312a','318a69a3-7377-4d58-adc7-3a6142b00887',1,1,1791414096670);
/*!40000 ALTER TABLE `counter_changes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `counters`
--

DROP TABLE IF EXISTS `counters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `counters` (
  `id` varchar(36) NOT NULL,
  `ownerId` varchar(36) NOT NULL,
  `targetId` varchar(36) NOT NULL,
  `label` varchar(80) NOT NULL,
  `emoji` varchar(16) NOT NULL,
  `value` int(11) NOT NULL DEFAULT 0,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_691eb5379d18ff45212ea610160` (`targetId`),
  KEY `ix_counter_owner` (`ownerId`),
  CONSTRAINT `FK_691eb5379d18ff45212ea610160` FOREIGN KEY (`targetId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_8cece2bc1d5ee6c906605f18e69` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `counters`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `counters` WRITE;
/*!40000 ALTER TABLE `counters` DISABLE KEYS */;
INSERT INTO `counters` VALUES
('3fbf7f64-e443-4a2a-8a98-10f23349312a','318a69a3-7377-4d58-adc7-3a6142b00887','b8756646-d844-4bf2-9605-044100d7d7b1','Veces que me ignoraste','👻',1,1791413975233),
('475f4d26-9e3f-465b-8f9d-dd0648e11834','318a69a3-7377-4d58-adc7-3a6142b00887','b8756646-d844-4bf2-9605-044100d7d7b1','Me hiciste enojar','😤',0,1791414348422);
/*!40000 ALTER TABLE `counters` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `mail_jobs`
--

DROP TABLE IF EXISTS `mail_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mail_jobs` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `resourceId` varchar(36) NOT NULL,
  `kind` varchar(16) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `body` text NOT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'pending',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `nextAttemptAt` double NOT NULL,
  `lockedUntil` double DEFAULT NULL,
  `leaseToken` varchar(36) DEFAULT NULL,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_5992bb4175c6a210f564faef6fd` (`userId`),
  KEY `ix_mail_due` (`status`,`nextAttemptAt`),
  CONSTRAINT `FK_5992bb4175c6a210f564faef6fd` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mail_jobs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `mail_jobs` WRITE;
/*!40000 ALTER TABLE `mail_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `mail_jobs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` varchar(36) NOT NULL,
  `ownerId` varchar(36) NOT NULL,
  `targetId` varchar(36) NOT NULL,
  `body` text NOT NULL,
  `deliverAt` double NOT NULL,
  `releasedAt` double DEFAULT NULL,
  `ownerHidden` tinyint(1) NOT NULL DEFAULT 0,
  `targetHidden` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_message_due` (`releasedAt`,`deliverAt`),
  KEY `ix_message_owner` (`ownerId`,`deliverAt`),
  KEY `ix_message_target` (`targetId`,`deliverAt`),
  CONSTRAINT `FK_acb75cb21e718f808a4af6106f4` FOREIGN KEY (`targetId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_cf803e7bc9c4823b6ab03de6c13` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES
(1,1791410400000,'Initial1791410400000'),
(2,1791414000000,'Agenda1791414000000'),
(3,1791420000000,'Together1791420000000');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `text` varchar(180) NOT NULL,
  `kind` varchar(16) NOT NULL,
  `resourceId` varchar(36) DEFAULT NULL,
  `dismissed` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_notification_user_time` (`userId`,`createdAt`),
  CONSTRAINT `FK_692a909ee0fa9383e7859f9b406` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES
('de4470fa-f4a0-4cf1-b2dc-12cc521cfbd4','b8756646-d844-4bf2-9605-044100d7d7b1','Ronaldo agregó: Me hiciste enojar','counter','475f4d26-9e3f-465b-8f9d-dd0648e11834',0,1791414348423),
('e25f2aaa-620e-4a6d-a024-1e02516a4f6e','b8756646-d844-4bf2-9605-044100d7d7b1','Ronaldo agregó: Veces que me ignoraste','counter','3fbf7f64-e443-4a2a-8a98-10f23349312a',0,1791413975235);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `userId` varchar(36) NOT NULL,
  `codeHash` varchar(64) NOT NULL,
  `expiresAt` double NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`userId`),
  CONSTRAINT `FK_d95569f623f28a0bf034a55099e` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `petitions`
--

DROP TABLE IF EXISTS `petitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `petitions` (
  `id` varchar(36) NOT NULL,
  `ownerId` varchar(36) NOT NULL,
  `targetId` varchar(36) NOT NULL,
  `title` varchar(120) NOT NULL,
  `details` text NOT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'pending',
  `responseNote` text NOT NULL,
  `createdAt` double NOT NULL,
  `updatedAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_petition_owner` (`ownerId`,`createdAt`),
  KEY `ix_petition_target` (`targetId`,`createdAt`),
  CONSTRAINT `FK_5df0f0bcc5793ba68210b0aa279` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_d8f174e5db6f599dc49e2832b23` FOREIGN KEY (`targetId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `petitions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `petitions` WRITE;
/*!40000 ALTER TABLE `petitions` DISABLE KEYS */;
/*!40000 ALTER TABLE `petitions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `reminders`
--

DROP TABLE IF EXISTS `reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reminders` (
  `id` varchar(36) NOT NULL,
  `ownerId` varchar(36) NOT NULL,
  `targetId` varchar(36) NOT NULL,
  `title` varchar(120) NOT NULL,
  `notes` text NOT NULL,
  `remindAt` double NOT NULL,
  `email` tinyint(1) NOT NULL DEFAULT 0,
  `deliveredAt` double DEFAULT NULL,
  `completedAt` double DEFAULT NULL,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_8f88a5f63e2d4b75badfce9a728` (`ownerId`),
  KEY `ix_reminder_target_date` (`targetId`,`remindAt`),
  CONSTRAINT `FK_8f88a5f63e2d4b75badfce9a728` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_c588050656b89ff11385d7684cd` FOREIGN KEY (`targetId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reminders`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `reminders` WRITE;
/*!40000 ALTER TABLE `reminders` DISABLE KEYS */;
/*!40000 ALTER TABLE `reminders` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `tokenHash` varchar(64) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `expiresAt` double NOT NULL,
  PRIMARY KEY (`tokenHash`),
  KEY `ix_sessions_user` (`userId`),
  KEY `ix_sessions_expiry` (`expiresAt`),
  CONSTRAINT `FK_57de40bc620f456c7311aa3a1e6` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES
('666609f386b4606454c4c5a0a8d4244db3b5108117172641ec01744928b8ea26','318a69a3-7377-4d58-adc7-3a6142b00887',1792018745552),
('e73d1a30d9b080cd2205c6a16e9f09bafa034dc266e65f1c356ff5dbb288515d','318a69a3-7377-4d58-adc7-3a6142b00887',1792051662124);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` varchar(36) NOT NULL,
  `ownerId` varchar(36) NOT NULL,
  `title` varchar(120) NOT NULL,
  `notes` text NOT NULL,
  `priority` int(11) NOT NULL,
  `dueAt` double DEFAULT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `dueNotified` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` double NOT NULL,
  `updatedAt` double NOT NULL,
  `recurrence` varchar(12) NOT NULL DEFAULT 'none',
  `recurrenceUntil` double DEFAULT NULL,
  `recurrenceAnchor` double DEFAULT NULL,
  `nextTaskId` varchar(36) DEFAULT NULL,
  `email` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ix_tasks_owner_due` (`ownerId`,`completed`,`dueAt`),
  CONSTRAINT `FK_607de52438268ab19a406349427` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `slug` varchar(16) NOT NULL,
  `name` varchar(50) NOT NULL,
  `email` varchar(254) NOT NULL,
  `passwordHash` varchar(250) NOT NULL,
  `mustChangePassword` tinyint(1) NOT NULL DEFAULT 1,
  `accent` varchar(16) NOT NULL DEFAULT 'rose',
  `failedLogins` int(11) NOT NULL DEFAULT 0,
  `lockedUntil` double NOT NULL DEFAULT 0,
  `createdAt` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_bc0c27d77ee64f0a097a5c269b3` (`slug`),
  UNIQUE KEY `UQ_97672ac88f789774dd47f7c8be3` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
('318a69a3-7377-4d58-adc7-3a6142b00887','ronaldo','Ronaldo','ronaldomoradiaz08@gmail.com','scrypt:d52c0d8335d138ba77a5a089ee08932c:743e4557af1071e6b3da235e6bc16cb520151d6294cf44cf4ac4a7553b2ecaa32f3372c1565355ae97c8887bad173530b973665661e31a94c8d91e23f49984cd',0,'sage',0,0,1791413697593),
('b8756646-d844-4bf2-9605-044100d7d7b1','scarlet','Scarlet','scarreyesg22@gmail.com','scrypt:63596e1d5177ffe5b5f1b3a41268231b:95071975bb6c6fb042303192be527b419db851fbd2492f70c2a54f8c520cac1ef49ed7c85580f847d0a617cc878ddb583d33b23e02fc74ea5ee1638b4faca489',1,'rose',0,0,1791413697636);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-08  2:34:17
