-- RecallRadar sample data export. Import after database/mysql/schema.sql.
-- Data-only export with explicit primary and foreign key values in dependency-safe order.
-- app_user.password_hash format: scrypt$N$r$p$salt$derivedKey (Base64URL fields).
-- Generated with Node.js crypto.scrypt using N=16384, r=8, p=1, and a 64-byte derived key.
-- A future verifier should decode the stored salt/key, recompute scrypt, and compare in constant time.
-- Plaintext passwords and database credentials are not included.
INSERT INTO `app_user` VALUES (1,'Maya Chen','maya.chen@recallradar.example','scrypt$16384$8$1$AViU3llrv7M9zeTk8IQ7tA$J2mjUnOFqQrAf6POCtVxjboBp4AtRCaCznbZlp57Md4dk3suxXffmnq433SsjpH5OIesqDXxG-SjXkVb1pVhzw','recall_manager');
INSERT INTO `supplier` VALUES (1,'Northstar Precision Components','supply@northstar.example','+1-555-0142','1200 Meridian Ave, San Jose, CA');
INSERT INTO `product` VALUES (1,'FrostGuard Vaccine Monitor','Cold-Chain Monitoring','FGVM-TEMP-001');
INSERT INTO `inventory_location` VALUES (1,'FrostGuard Finished Goods Warehouse','warehouse','500 Industrial Way, San Jose, CA');
INSERT INTO `distributor` VALUES (1,'ArcticLink Medical Distribution','Western US','receiving@arcticlink.example');
INSERT INTO `component` VALUES (1,'Temperature Sensor','Temperature Sensor',1);
INSERT INTO `component_batch` VALUES (1,'NSPC-TS-2026-0812','2026-08-12','2028-08-11',300,'active',1);
INSERT INTO `product_component` VALUES (1,1,1.00);
INSERT INTO `product_batch` VALUES (1,'FGVM-2026-0915-A','2026-09-15',120,'active',1);
INSERT INTO `product_batch_component` VALUES (1,1,120.00);
INSERT INTO `shipment` VALUES (1,'2026-10-20',40,'delivered',1,1);
INSERT INTO `inventory` VALUES (1,80,'2026-11-08 17:21:23',1,1);
INSERT INTO `recall` VALUES (1,'2026-11-05','Temperature sensor calibration drift may cause inaccurate vaccine storage readings; quarantine affected monitors and verify readings.','high','open',1,1,1);
INSERT INTO `recall_impact` VALUES (1,'2026-11-06','Potentially affected FrostGuard product batch',1,1);
