'use server';

import { requireMemberBReadAccess, requireMemberBWriteAccess } from './auth';
import { pool } from './db';
import {
  createAppUser as createAppUserCore,
  createDistributor as createDistributorCore,
  createInventory as createInventoryCore,
  createInventoryLocation as createInventoryLocationCore,
  createRecall as createRecallCore,
  createRecallImpact as createRecallImpactCore,
  createShipment as createShipmentCore,
  deleteAppUser as deleteAppUserCore,
  deleteDistributor as deleteDistributorCore,
  deleteInventory as deleteInventoryCore,
  deleteInventoryLocation as deleteInventoryLocationCore,
  deleteRecall as deleteRecallCore,
  deleteRecallImpact as deleteRecallImpactCore,
  deleteShipment as deleteShipmentCore,
  getAllAppUsers as getAllAppUsersCore,
  getAllDistributors as getAllDistributorsCore,
  getAllInventory as getAllInventoryCore,
  getAllInventoryLocations as getAllInventoryLocationsCore,
  getAllRecallImpacts as getAllRecallImpactsCore,
  getAllRecalls as getAllRecallsCore,
  getAllShipments as getAllShipmentsCore,
  getAppUserById as getAppUserByIdCore,
  getDistributorById as getDistributorByIdCore,
  getInventoryById as getInventoryByIdCore,
  getInventoryLocationById as getInventoryLocationByIdCore,
  getRecallById as getRecallByIdCore,
  getRecallImpactById as getRecallImpactByIdCore,
  getShipmentById as getShipmentByIdCore,
  type AppUserInput,
  type DistributorInput,
  type InventoryInput,
  type InventoryLocationInput,
  type RecallImpactInput,
  type RecallInput,
  type ShipmentInput,
  updateAppUser as updateAppUserCore,
  updateDistributor as updateDistributorCore,
  updateInventory as updateInventoryCore,
  updateInventoryLocation as updateInventoryLocationCore,
  updateRecall as updateRecallCore,
  updateRecallImpact as updateRecallImpactCore,
  updateShipment as updateShipmentCore,
} from './member-b-core';

export type {
  AppUserInput,
  AppUserRecord,
  DistributorInput,
  DistributorRecord,
  InventoryInput,
  InventoryLocationInput,
  InventoryLocationRecord,
  InventoryRecord,
  RecallImpactInput,
  RecallImpactRecord,
  RecallInput,
  RecallRecord,
  ShipmentInput,
  ShipmentRecord,
} from './member-b-core';

async function ensureMemberBReadAccess() {
  await requireMemberBReadAccess();
}

async function ensureMemberBWriteAccess() {
  await requireMemberBWriteAccess();
}

export async function createDistributor(input: DistributorInput) {
  await ensureMemberBWriteAccess();
  return createDistributorCore(pool, input);
}

export async function getAllDistributors() {
  await ensureMemberBReadAccess();
  return getAllDistributorsCore(pool);
}

export async function getDistributorById(distributorId: number) {
  await ensureMemberBReadAccess();
  return getDistributorByIdCore(pool, distributorId);
}

export async function updateDistributor(distributorId: number, input: Partial<DistributorInput>) {
  await ensureMemberBWriteAccess();
  return updateDistributorCore(pool, distributorId, input);
}

export async function deleteDistributor(distributorId: number) {
  await ensureMemberBWriteAccess();
  return deleteDistributorCore(pool, distributorId);
}

export async function createShipment(input: ShipmentInput) {
  await ensureMemberBWriteAccess();
  return createShipmentCore(pool, input);
}

export async function getAllShipments() {
  await ensureMemberBReadAccess();
  return getAllShipmentsCore(pool);
}

export async function getShipmentById(shipmentId: number) {
  await ensureMemberBReadAccess();
  return getShipmentByIdCore(pool, shipmentId);
}

export async function updateShipment(shipmentId: number, input: Partial<ShipmentInput>) {
  await ensureMemberBWriteAccess();
  return updateShipmentCore(pool, shipmentId, input);
}

export async function deleteShipment(shipmentId: number) {
  await ensureMemberBWriteAccess();
  return deleteShipmentCore(pool, shipmentId);
}

export async function createInventoryLocation(input: InventoryLocationInput) {
  await ensureMemberBWriteAccess();
  return createInventoryLocationCore(pool, input);
}

export async function getAllInventoryLocations() {
  await ensureMemberBReadAccess();
  return getAllInventoryLocationsCore(pool);
}

export async function getInventoryLocationById(locationId: number) {
  await ensureMemberBReadAccess();
  return getInventoryLocationByIdCore(pool, locationId);
}

export async function updateInventoryLocation(locationId: number, input: Partial<InventoryLocationInput>) {
  await ensureMemberBWriteAccess();
  return updateInventoryLocationCore(pool, locationId, input);
}

export async function deleteInventoryLocation(locationId: number) {
  await ensureMemberBWriteAccess();
  return deleteInventoryLocationCore(pool, locationId);
}

export async function createInventory(input: InventoryInput) {
  await ensureMemberBWriteAccess();
  return createInventoryCore(pool, input);
}

export async function getAllInventory() {
  await ensureMemberBReadAccess();
  return getAllInventoryCore(pool);
}

export async function getInventoryById(inventoryId: number) {
  await ensureMemberBReadAccess();
  return getInventoryByIdCore(pool, inventoryId);
}

export async function updateInventory(inventoryId: number, input: Partial<InventoryInput>) {
  await ensureMemberBWriteAccess();
  return updateInventoryCore(pool, inventoryId, input);
}

export async function deleteInventory(inventoryId: number) {
  await ensureMemberBWriteAccess();
  return deleteInventoryCore(pool, inventoryId);
}

export async function createAppUser(input: AppUserInput) {
  await ensureMemberBWriteAccess();
  return createAppUserCore(pool, input);
}

export async function getAllAppUsers() {
  await ensureMemberBReadAccess();
  return getAllAppUsersCore(pool);
}

export async function getAppUserById(userId: number) {
  await ensureMemberBReadAccess();
  return getAppUserByIdCore(pool, userId);
}

export async function updateAppUser(userId: number, input: Partial<AppUserInput>) {
  await ensureMemberBWriteAccess();
  return updateAppUserCore(pool, userId, input);
}

export async function deleteAppUser(userId: number) {
  await ensureMemberBWriteAccess();
  return deleteAppUserCore(pool, userId);
}

export async function createRecall(input: RecallInput) {
  await ensureMemberBWriteAccess();
  return createRecallCore(pool, input);
}

export async function getAllRecalls() {
  await ensureMemberBReadAccess();
  return getAllRecallsCore(pool);
}

export async function getRecallById(recallId: number) {
  await ensureMemberBReadAccess();
  return getRecallByIdCore(pool, recallId);
}

export async function updateRecall(recallId: number, input: Partial<RecallInput>) {
  await ensureMemberBWriteAccess();
  return updateRecallCore(pool, recallId, input);
}

export async function deleteRecall(recallId: number) {
  await ensureMemberBWriteAccess();
  return deleteRecallCore(pool, recallId);
}

export async function createRecallImpact(input: RecallImpactInput) {
  await ensureMemberBWriteAccess();
  return createRecallImpactCore(pool, input);
}

export async function getAllRecallImpacts() {
  await ensureMemberBReadAccess();
  return getAllRecallImpactsCore(pool);
}

export async function getRecallImpactById(recallImpactId: number) {
  await ensureMemberBReadAccess();
  return getRecallImpactByIdCore(pool, recallImpactId);
}

export async function updateRecallImpact(recallImpactId: number, input: Partial<RecallImpactInput>) {
  await ensureMemberBWriteAccess();
  return updateRecallImpactCore(pool, recallImpactId, input);
}

export async function deleteRecallImpact(recallImpactId: number) {
  await ensureMemberBWriteAccess();
  return deleteRecallImpactCore(pool, recallImpactId);
}
