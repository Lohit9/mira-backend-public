-- CreateEnum
CREATE TYPE "FulfillmentChannel" AS ENUM ('FBA', 'FBM');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CAD', 'USD');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "salesChannel" VARCHAR(50) NOT NULL,
    "orderStatus" VARCHAR(50) NOT NULL,
    "numItemsShipped" INTEGER NOT NULL,
    "isPrime" BOOLEAN NOT NULL,
    "fulfillmentChannel" "FulfillmentChannel" NOT NULL,
    "shipServiceLevel" VARCHAR(50) NOT NULL,
    "orderTotal" INTEGER,
    "orderCurrency" "Currency",
    "shippingAddressCountryCode" VARCHAR(5),
    "shippingAddressStateOrRegion" VARCHAR(100),
    "shippingAddressCity" VARCHAR(100),
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "marketplaceId" VARCHAR(40) NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
