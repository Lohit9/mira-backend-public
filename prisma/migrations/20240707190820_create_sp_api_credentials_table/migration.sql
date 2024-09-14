/*
  Warnings:

  - You are about to drop the column `fulfillmentChannel` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `isPrime` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `marketplaceId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `numItemsShipped` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderCurrency` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderStatus` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderTotal` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseDate` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `salesChannel` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `sellerId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shipServiceLevel` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddressCity` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddressCountryCode` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddressStateOrRegion` on the `orders` table. All the data in the column will be lost.
  - Added the required column `fulfillment_channel` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `is_prime` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marketplace_id` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `num_items_shipped` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_status` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchase_date` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sales_channel` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seller_id` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ship_service_level` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "fulfillmentChannel",
DROP COLUMN "isPrime",
DROP COLUMN "marketplaceId",
DROP COLUMN "numItemsShipped",
DROP COLUMN "orderCurrency",
DROP COLUMN "orderStatus",
DROP COLUMN "orderTotal",
DROP COLUMN "purchaseDate",
DROP COLUMN "salesChannel",
DROP COLUMN "sellerId",
DROP COLUMN "shipServiceLevel",
DROP COLUMN "shippingAddressCity",
DROP COLUMN "shippingAddressCountryCode",
DROP COLUMN "shippingAddressStateOrRegion",
ADD COLUMN     "fulfillment_channel" "FulfillmentChannel" NOT NULL,
ADD COLUMN     "is_prime" BOOLEAN NOT NULL,
ADD COLUMN     "marketplace_id" VARCHAR(40) NOT NULL,
ADD COLUMN     "num_items_shipped" INTEGER NOT NULL,
ADD COLUMN     "order_currency" "Currency",
ADD COLUMN     "order_status" VARCHAR(50) NOT NULL,
ADD COLUMN     "order_total" INTEGER,
ADD COLUMN     "purchase_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sales_channel" VARCHAR(50) NOT NULL,
ADD COLUMN     "seller_id" TEXT NOT NULL,
ADD COLUMN     "ship_service_level" VARCHAR(50) NOT NULL,
ADD COLUMN     "shipping_addres_country_code" VARCHAR(5),
ADD COLUMN     "shipping_address_city" VARCHAR(100),
ADD COLUMN     "shipping_address_state_or_region" VARCHAR(100);

-- CreateTable
CREATE TABLE "sp_api_account_credentials" (
    "seller_id" TEXT NOT NULL,
    "long_term_refresh_token" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,

    CONSTRAINT "sp_api_account_credentials_pkey" PRIMARY KEY ("seller_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sp_api_account_credentials_long_term_refresh_token_key" ON "sp_api_account_credentials"("long_term_refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "sp_api_account_credentials_client_id_key" ON "sp_api_account_credentials"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "sp_api_account_credentials_client_secret_key" ON "sp_api_account_credentials"("client_secret");
