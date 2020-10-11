import { axiosConfig } from "./axiosConfig";
import axios, { AxiosInstance } from "axios";
import logger from "./logger";
import * as dotenv from "dotenv";
import onRequestFulfilled from "./middlewares/onRequestFulfilled";
import onRequestRejected from "./middlewares/onRequestRejected";
import onResponseRejected from "./middlewares/onResponseRejected";
import formData from "form-data";
import { User } from "user";
import { Store } from "store";
import { Session } from "session";

enum apiClientMethods {
  GET = "GET",
  POST = "POST",
}

class ApiClient {
  _axiosInstance: AxiosInstance = null;
  session: Session;

  constructor() {
    dotenv.config();
    this.init();
  }

  private init() {
    this._axiosInstance = axios.create(axiosConfig);
    this._axiosInstance.interceptors.request.use((config) => {
      return onRequestFulfilled(config, this.session || null);
    }, onRequestRejected);
    this._axiosInstance.interceptors.response.use((response) => {
      return response;
    }, onResponseRejected);
  }

  /**
   * login action, use params from .env file
   * @return Boolean - if is valid return true, else false
   */
  async login(): Promise<Boolean> {
    const resp = await this._req<{ session: Session }>(
      "sessions",
      apiClientMethods.POST,
      {}
    );
    if (resp.session) {
      this.session = resp.session;
      return true;
    }
    throw "Problem with session, access token not valid, on login action";
  }

  /**
   * Получение данных о юзере
   */
  public async getUser(): Promise<{ user: User }> {
    const email = process.env.email;
    return await this._req<{ user: User }>(
      `users/${email}`,
      apiClientMethods.GET,
      {}
    );
  }

  /**
   * Получение данных о магазине
   * @param storeId
   */
  public async getStore(storeId: number): Promise<{ store: Store }> {
    return await this._req<{ store: Store }>(
      `stores/${storeId}`,
      apiClientMethods.GET,
      {}
    );
  }

  /**
   * Получить текущий заказ/корзину
   */
  public async getCurrentOrder() {
    return await this._req("orders/current", apiClientMethods.GET, {});
  }

  /**
   * Получить список продуктов в категории
   * @param taxonId
   * @param storeId
   */
  public async getCategoryProducts(taxonId: number, storeId: number) {
    return await this._req(
      `taxons/${taxonId}?sid=${storeId}`,
      apiClientMethods.GET,
      {}
    );
  }

  /**
   * Получить информацию о товаре
   * @param productId
   */
  public async getProduct(productId: number) {
    return await this._req(`products/${productId}`, apiClientMethods.GET, {});
  }

  /**
   * Добавить товар в заказ/корзину
   * @param orderNumber
   * @param productId
   * @param quantity
   */
  public async addToOrder(
    orderNumber: string,
    productId: number,
    quantity: number = 1
  ) {
    const form = new formData();
    form.append("line_item[order_number]", orderNumber);
    form.append("line_item[product_id]", productId);
    form.append("line_item[quantity]", quantity);
    return await this._req(`line_items`, apiClientMethods.POST, form);
  }

  /**
   * Искать по товарам/ категориям с пагинацией
   * @param storeId - id магазина
   * @param query - поисковый запрос
   * @param perPage - количество продуктов на одной странице
   * @param page - номер страницы
   */
  public async search(storeId: number, query: string, perPage = 20, page = 1) {
    return await this._req(
      `products?page=${page}&per_page=${perPage}&q=${query}&sid=${storeId}`,
      apiClientMethods.GET,
      {}
    );
  }

  /**
   * Метод выполняет запрос к api sbermarket
   * @param url - конкретный адрес для запроса
   * @param method -
   * @param data
   * @private
   */
  private async _req<T>(
    url: string,
    method: apiClientMethods,
    data: object
  ): Promise<T> {
    try {
      const response = await this._axiosInstance({ method, url, data });
      if (response.status === 200) {
        logger.info(`${method}::/${url}=>${response.status}`);
        return response.data;
      }
    } catch (e) {
      logger.error(`${method} :: ${url}=> `, e);
      return Promise.reject(e);
    }
  }
}

export default new ApiClient();
